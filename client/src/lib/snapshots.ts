/**
 * Dashboard version history (snapshots).
 * --------------------------------------------------------------------
 * Captures the full state of the dashboard — every property, note,
 * photo, floor plan, PDF, milestone, custom field, layout setting —
 * into one snapshot stored in IndexedDB. Lets the user roll back to
 * any prior version with one click.
 *
 * What's captured:
 *   - All localStorage keys prefixed `cre_` (leases, notes, milestones,
 *     manual dates, portfolios, assignments, users, layouts, etc.)
 *   - All IndexedDB `kv` store entries (photos, documents, client logos)
 *
 * Storage:
 *   - IndexedDB DB `cre_platform`, store `snapshots` (separate from `kv`)
 *   - Each snapshot: { id, createdAt, label, autoSaved, sizeBytes, data }
 *
 * Retention:
 *   - Keeps up to MAX_SNAPSHOTS (30) total
 *   - When over the cap, oldest auto-saved snapshots are pruned first;
 *     manual snapshots are never auto-pruned.
 *
 * Auto-snapshot:
 *   - On app boot, a snapshot is taken if (a) none exists, or (b) the
 *     last one is older than AUTO_INTERVAL_MS (10 min) AND the data
 *     fingerprint has changed since the last snapshot.
 */

import { openDB, type IDBPDatabase } from 'idb';
import { idbGet, idbSet } from './useIDBPersistedState';

const DB_NAME = 'cre_platform';
const KV_STORE = 'kv';
const SNAP_STORE = 'snapshots';
const DB_VERSION = 2; // bumped from 1 to add the snapshots store

export const MAX_SNAPSHOTS = 30;
export const AUTO_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// IndexedDB-backed keys we know about. We also enumerate everything in the
// kv store at snapshot time to catch keys not listed here.
const KNOWN_IDB_KEYS = [
  'cre_lease_documents',
  'cre_lease_photos',
  'cre_client_logos',
];

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB unavailable'));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(KV_STORE)) {
          db.createObjectStore(KV_STORE);
        }
        if (oldVersion < 2 && !db.objectStoreNames.contains(SNAP_STORE)) {
          // Keyed by snapshot id (string).
          const store = db.createObjectStore(SNAP_STORE, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
}

// ─── Types ────────────────────────────────────────────────────────────

export interface SnapshotSummary {
  id: string;
  createdAt: number;
  label: string;
  autoSaved: boolean;
  sizeBytes: number;
}

export interface SnapshotPayload {
  localStorage: Record<string, string>;
  idb: Record<string, any>;
}

export interface Snapshot extends SnapshotSummary {
  data: SnapshotPayload;
  fingerprint: string; // cheap content hash so we can skip duplicate auto-saves
}

// ─── Capture ──────────────────────────────────────────────────────────

function captureLocalStorage(): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof window === 'undefined' || !window.localStorage) return out;
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key) continue;
    // Only capture our app's keys. Skip recovery flags (those are device-local).
    if (key.startsWith('cre_') && !key.includes('recovery')) {
      const v = window.localStorage.getItem(key);
      if (v != null) out[key] = v;
    }
  }
  return out;
}

async function captureIDB(): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  try {
    const db = await getDB();
    // Read everything in the kv store, plus the known keys to be safe.
    const keys = (await db.getAllKeys(KV_STORE)) as IDBValidKey[];
    const merged = new Set<string>(KNOWN_IDB_KEYS);
    keys.forEach(k => { if (typeof k === 'string') merged.add(k); });
    for (const key of merged) {
      const v = await db.get(KV_STORE, key);
      if (v !== undefined) out[key] = v;
    }
  } catch {
    /* idb may be unavailable in some private modes — return what we have */
  }
  return out;
}

function approxSize(payload: SnapshotPayload): number {
  // Cheap size estimate — JSON.stringify each section. We don't need exact.
  try {
    return JSON.stringify(payload).length;
  } catch {
    return 0;
  }
}

// djb2 string hash — cheap, no crypto needed.
function quickHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

function fingerprintFor(payload: SnapshotPayload): string {
  // Stable fingerprint over keys + sizes (not full content) so we don't
  // pay to JSON-stringify multi-MB blobs twice.
  const lsKeys = Object.keys(payload.localStorage).sort();
  const idbKeys = Object.keys(payload.idb).sort();
  const parts: string[] = [];
  for (const k of lsKeys) parts.push(`L:${k}:${payload.localStorage[k].length}`);
  for (const k of idbKeys) {
    const v = payload.idb[k];
    let n = 0;
    try { n = JSON.stringify(v).length; } catch { n = 0; }
    parts.push(`I:${k}:${n}`);
  }
  return quickHash(parts.join('|'));
}

// ─── Public API ───────────────────────────────────────────────────────

export async function createSnapshot(options: {
  label?: string;
  autoSaved?: boolean;
} = {}): Promise<SnapshotSummary> {
  const localData = captureLocalStorage();
  const idbData = await captureIDB();
  const payload: SnapshotPayload = { localStorage: localData, idb: idbData };
  const sizeBytes = approxSize(payload);
  const fingerprint = fingerprintFor(payload);

  const snap: Snapshot = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    label: options.label || (options.autoSaved ? 'Auto-saved' : 'Manual snapshot'),
    autoSaved: !!options.autoSaved,
    sizeBytes,
    fingerprint,
    data: payload,
  };

  const db = await getDB();
  await db.put(SNAP_STORE, snap);
  await pruneOldSnapshots();

  return summarize(snap);
}

export async function listSnapshots(): Promise<SnapshotSummary[]> {
  try {
    const db = await getDB();
    const all = (await db.getAll(SNAP_STORE)) as Snapshot[];
    return all
      .map(summarize)
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function getSnapshot(id: string): Promise<Snapshot | undefined> {
  try {
    const db = await getDB();
    return (await db.get(SNAP_STORE, id)) as Snapshot | undefined;
  } catch {
    return undefined;
  }
}

export async function deleteSnapshot(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(SNAP_STORE, id);
  } catch { /* noop */ }
}

/**
 * Restore the dashboard to a snapshot.
 * 1. Take an "Before restore" safety snapshot of current state.
 * 2. Wipe current cre_* localStorage keys and known IDB keys.
 * 3. Apply the snapshot's data.
 * 4. Reload so React re-hydrates everything fresh.
 */
export async function restoreSnapshot(id: string): Promise<void> {
  const snap = await getSnapshot(id);
  if (!snap) throw new Error('Snapshot not found');

  // Safety snapshot of the current state, in case the restore was a mistake.
  try {
    await createSnapshot({ label: 'Before restore', autoSaved: true });
  } catch { /* don't block restore if safety snapshot fails */ }

  // Wipe current cre_* localStorage entries (skip recovery flags).
  if (typeof window !== 'undefined' && window.localStorage) {
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith('cre_') && !k.includes('recovery')) toRemove.push(k);
    }
    toRemove.forEach(k => window.localStorage.removeItem(k));
  }

  // Wipe known IDB keys (and any present in the snapshot).
  const idbKeysToWipe = new Set<string>([
    ...KNOWN_IDB_KEYS,
    ...Object.keys(snap.data.idb || {}),
  ]);
  try {
    const db = await getDB();
    for (const k of idbKeysToWipe) {
      try { await db.delete(KV_STORE, k); } catch { /* noop */ }
    }
  } catch { /* noop */ }

  // Apply snapshot localStorage.
  if (typeof window !== 'undefined' && window.localStorage) {
    for (const [k, v] of Object.entries(snap.data.localStorage)) {
      try { window.localStorage.setItem(k, v); } catch { /* quota? */ }
    }
  }

  // Apply snapshot IDB entries.
  for (const [k, v] of Object.entries(snap.data.idb)) {
    try { await idbSet(k, v); } catch { /* noop */ }
  }

  // Hard reload to re-hydrate React state fully.
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}

export async function exportSnapshotJSON(id: string): Promise<string> {
  const snap = await getSnapshot(id);
  if (!snap) throw new Error('Snapshot not found');
  return JSON.stringify({
    __schema: 'cre-platform-snapshot/v1',
    snapshot: snap,
  });
}

export async function importSnapshotJSON(json: string): Promise<SnapshotSummary> {
  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('File is not valid JSON');
  }
  const snap = parsed?.snapshot;
  if (!snap || !snap.data || !snap.data.localStorage) {
    throw new Error('Not a valid CRE platform snapshot file');
  }
  // Re-id so it doesn't collide with existing.
  const imported: Snapshot = {
    ...snap,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    autoSaved: false,
    label: snap.label ? `${snap.label} (imported)` : 'Imported snapshot',
    fingerprint: snap.fingerprint || fingerprintFor(snap.data),
  };
  const db = await getDB();
  await db.put(SNAP_STORE, imported);
  await pruneOldSnapshots();
  return summarize(imported);
}

// ─── Internal helpers ─────────────────────────────────────────────────

function summarize(s: Snapshot): SnapshotSummary {
  return {
    id: s.id,
    createdAt: s.createdAt,
    label: s.label,
    autoSaved: s.autoSaved,
    sizeBytes: s.sizeBytes,
  };
}

async function pruneOldSnapshots(): Promise<void> {
  try {
    const db = await getDB();
    const all = (await db.getAll(SNAP_STORE)) as Snapshot[];
    if (all.length <= MAX_SNAPSHOTS) return;
    // Sort oldest → newest; prune oldest AUTO snapshots first, then oldest manual.
    const sorted = [...all].sort((a, b) => a.createdAt - b.createdAt);
    const overflow = sorted.length - MAX_SNAPSHOTS;
    let removed = 0;
    // Pass 1: auto only
    for (const s of sorted) {
      if (removed >= overflow) break;
      if (s.autoSaved) {
        await db.delete(SNAP_STORE, s.id);
        removed++;
      }
    }
    if (removed < overflow) {
      // Pass 2: manual (oldest first)
      for (const s of sorted) {
        if (removed >= overflow) break;
        if (!s.autoSaved) {
          await db.delete(SNAP_STORE, s.id);
          removed++;
        }
      }
    }
  } catch { /* noop */ }
}

// ─── Auto-snapshot scheduler ──────────────────────────────────────────

let autoTimer: number | null = null;
let lastFingerprint: string | null = null;

/**
 * Starts the auto-snapshot background loop. Call once from app boot.
 *  - Checks every AUTO_INTERVAL_MS whether the data fingerprint has
 *    changed since the last snapshot; if so, takes a new auto snapshot.
 *  - Also runs an immediate check after a 30s warmup so first-time
 *    visitors get a baseline snapshot.
 */
export function startAutoSnapshot(): void {
  if (typeof window === 'undefined') return;
  if (autoTimer != null) return; // already running

  const check = async () => {
    try {
      const ls = captureLocalStorage();
      const idb = await captureIDB();
      const fp = fingerprintFor({ localStorage: ls, idb });
      if (lastFingerprint === null) {
        // First check — seed from the most recent existing snapshot.
        const existing = await listSnapshots();
        if (existing.length === 0) {
          await createSnapshot({ label: 'Initial baseline', autoSaved: true });
          lastFingerprint = fp;
          return;
        }
        const last = await getSnapshot(existing[0].id);
        lastFingerprint = last?.fingerprint || null;
      }
      if (fp !== lastFingerprint) {
        await createSnapshot({ autoSaved: true });
        lastFingerprint = fp;
      }
    } catch { /* swallow */ }
  };

  // Initial warmup check.
  window.setTimeout(check, 30 * 1000);
  // Recurring interval.
  autoTimer = window.setInterval(check, AUTO_INTERVAL_MS);
}

// ─── Formatting helpers (for UI) ──────────────────────────────────────

export function formatSnapshotTime(ts: number): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  let hh = d.getHours();
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ap = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12 || 12;
  return `${mm}/${dd}/${yyyy} ${hh}:${mi} ${ap}`;
}

export function formatBytes(n: number): string {
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}
