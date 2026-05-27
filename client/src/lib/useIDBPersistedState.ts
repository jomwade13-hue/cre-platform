import { useEffect, useRef, useState } from 'react';
import { openDB, type IDBPDatabase } from 'idb';

/**
 * IndexedDB-backed persistent state.
 * --------------------------------------------------------------------
 * Drop-in replacement for `usePersistedState` for any value that may
 * grow large (photo/document/logo data URLs in particular).
 *
 * Why not localStorage?
 *   localStorage caps at ~5–10 MB per origin. Once a portfolio collects
 *   enough photos/documents the writes silently fail (QuotaExceededError).
 *   IndexedDB raises the practical ceiling to hundreds of MB / several GB
 *   depending on the browser, with no per-key string-encoding overhead.
 *
 * What this hook does:
 *   - Synchronously seeds state from `initial`.
 *   - Asynchronously hydrates from IndexedDB on mount.
 *   - One-time migration: if a value exists in `localStorage` under the
 *     same key (legacy), copies it into IndexedDB and removes it from
 *     localStorage to free that ~5 MB cap immediately.
 *   - Persists every state change to IndexedDB (non-blocking).
 *   - Surfaces a one-time alert if a write actually fails (very rare).
 */

const DB_NAME = 'cre_platform';
const STORE_NAME = 'kv';
// IMPORTANT: must match the version + schema used by `snapshots.ts`. If two
// modules open the same IDB database at different versions, whichever runs
// first wins and the other gets a permanent VersionError, silently breaking
// all reads/writes. Keep this in lockstep with `DB_VERSION` in snapshots.ts.
const DB_VERSION = 2;
const SNAP_STORE = 'snapshots';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB unavailable'));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
        // Mirror the snapshots store from `snapshots.ts` so whichever module
        // opens the database first creates the full v2 schema.
        if (oldVersion < 2 && !db.objectStoreNames.contains(SNAP_STORE)) {
          const store = db.createObjectStore(SNAP_STORE, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
}

/** Read a value from IndexedDB. Returns undefined if missing or on error. */
export async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await getDB();
    return (await db.get(STORE_NAME, key)) as T | undefined;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[idbGet] read failed for '${key}':`, err);
    return undefined;
  }
}

/** Write a value to IndexedDB. Throws on quota / write failure. */
export async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, value, key);
}

/** Delete a value from IndexedDB. */
export async function idbDel(key: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(STORE_NAME, key);
  } catch { /* noop */ }
}

/** Notify the app when an IDB write fails (typically quota-exceeded). UI
 *  components subscribe to surface a recovery dialog. */
export interface IdbWriteFailureDetail {
  key: string;
  error: unknown;
  estimate?: { usage?: number; quota?: number };
}

const IDB_WRITE_FAILURE_EVENT = 'cre:idb-write-failure';

export function onIdbWriteFailure(
  handler: (detail: IdbWriteFailureDetail) => void,
): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<IdbWriteFailureDetail>).detail);
  window.addEventListener(IDB_WRITE_FAILURE_EVENT, listener as EventListener);
  return () => window.removeEventListener(IDB_WRITE_FAILURE_EVENT, listener as EventListener);
}

async function emitWriteFailure(key: string, error: unknown): Promise<void> {
  let estimate: { usage?: number; quota?: number } | undefined;
  try {
    if (navigator?.storage?.estimate) {
      const e = await navigator.storage.estimate();
      estimate = { usage: e.usage, quota: e.quota };
    }
  } catch { /* noop */ }
  try {
    window.dispatchEvent(new CustomEvent<IdbWriteFailureDetail>(IDB_WRITE_FAILURE_EVENT, {
      detail: { key, error, estimate },
    }));
  } catch { /* noop */ }
}

/**
 * Storage layout for `useIDBSplitRecordState`:
 *   `${prefix}__index`     → array of subkeys (small)
 *   `${prefix}__entry:<k>` → one entry per record key
 *
 * Splitting avoids the per-transaction blow-up that happens when every
 * photo / logo / document lives in a single record. Saving a new photo
 * now writes one ~300 KB row instead of rewriting every other photo at
 * the same time.
 */
const SPLIT_INDEX_SUFFIX = '__index';
const SPLIT_ENTRY_SEP = '__entry:';

/** Read every key in the kv store (used by split-record hydrate to recover
 *  entries even if the index is missing or partially written). */
export async function idbListKeys(): Promise<string[]> {
  try {
    const db = await getDB();
    const all = await db.getAllKeys(STORE_NAME);
    return (all as IDBValidKey[]).filter((k): k is string => typeof k === 'string');
  } catch {
    return [];
  }
}

/** One-time migration helper: if `key` lives in localStorage, copy to IDB and remove. */
async function migrateFromLocalStorage<T>(key: string): Promise<T | undefined> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return undefined;
    const raw = window.localStorage.getItem(key);
    if (raw == null) return undefined;
    const parsed = JSON.parse(raw) as T;
    await idbSet(key, parsed);
    // Free the localStorage slot only after the IDB write has resolved.
    window.localStorage.removeItem(key);
    return parsed;
  } catch {
    return undefined;
  }
}

export function useIDBPersistedState<T>(
  key: string,
  initial: T | (() => T),
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const initialRef = useRef<T>();
  if (initialRef.current === undefined) {
    initialRef.current = typeof initial === 'function' ? (initial as () => T)() : initial;
  }

  const [state, setState] = useState<T>(initialRef.current as T);
  const hydratedRef = useRef(false);

  // Hydrate from IndexedDB (with one-time migration from localStorage).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let stored = await idbGet<T>(key);
        if (stored === undefined) {
          // First load on this device after the upgrade — pull from localStorage if present.
          stored = await migrateFromLocalStorage<T>(key);
        }
        if (!cancelled && stored !== undefined) {
          setState(stored);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[useIDBPersistedState] hydrate failed for '${key}':`, err);
      } finally {
        if (!cancelled) hydratedRef.current = true;
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Persist on every change — but skip the initial render before hydration completes,
  // otherwise we'd overwrite the stored value with `initial`.
  useEffect(() => {
    if (!hydratedRef.current) return;
    idbSet(key, state).catch(err => {
      // eslint-disable-next-line no-console
      console.error(`[useIDBPersistedState] persist failed for '${key}':`, err);
      // Emit a recoverable event so a single global UI handler can surface
      // a useful dialog (with cleanup options) rather than a blocking alert
      // that fires once per session and then silently swallows the rest.
      void emitWriteFailure(key, err);
    });
  }, [key, state]);

  return [state, setState];
}

export default useIDBPersistedState;

// ─────────────────────────────────────────────────────────────────────────
// Split-record persisted state
// ─────────────────────────────────────────────────────────────────────────

function splitEntryKey(prefix: string, k: string): string {
  return `${prefix}${SPLIT_ENTRY_SEP}${k}`;
}
function splitIndexKey(prefix: string): string {
  return `${prefix}${SPLIT_INDEX_SUFFIX}`;
}

/**
 * Read a split-record's full Record<string, V> back from IDB. First trusts
 * the index; if the index is missing (e.g. partial migration), falls back
 * to scanning every key with the matching `${prefix}__entry:` prefix.
 */
export async function splitRecordGetAll<V>(prefix: string): Promise<Record<string, V>> {
  const out: Record<string, V> = {};
  try {
    const index = await idbGet<string[]>(splitIndexKey(prefix));
    const subkeys: string[] = Array.isArray(index)
      ? index
      : (await idbListKeys())
          .filter(k => k.startsWith(prefix + SPLIT_ENTRY_SEP))
          .map(k => k.slice((prefix + SPLIT_ENTRY_SEP).length));
    for (const k of subkeys) {
      const v = await idbGet<V>(splitEntryKey(prefix, k));
      if (v !== undefined) out[k] = v;
    }
  } catch { /* noop */ }
  return out;
}

/** Write a single entry in a split-record store. Independent transactions. */
export async function splitRecordSetEntry<V>(prefix: string, k: string, v: V): Promise<void> {
  await idbSet(splitEntryKey(prefix, k), v);
  // Refresh index opportunistically — best-effort, OK if it races.
  try {
    const idx = (await idbGet<string[]>(splitIndexKey(prefix))) || [];
    if (!idx.includes(k)) {
      await idbSet(splitIndexKey(prefix), [...idx, k]);
    }
  } catch { /* noop */ }
}

/** Delete a single entry from a split-record store. */
export async function splitRecordDelEntry(prefix: string, k: string): Promise<void> {
  await idbDel(splitEntryKey(prefix, k));
  try {
    const idx = (await idbGet<string[]>(splitIndexKey(prefix))) || [];
    if (idx.includes(k)) {
      await idbSet(splitIndexKey(prefix), idx.filter(x => x !== k));
    }
  } catch { /* noop */ }
}

/**
 * Drop-in replacement for `useIDBPersistedState` when the value is a
 * `Record<string, V>` and individual entries can be large (photo arrays,
 * logo data URLs, document arrays). Each entry is persisted under its own
 * IDB key, so a single mutation only writes the changed entries — never
 * the whole record.
 *
 * Migration is automatic: if the legacy single-key value still exists
 * under `prefix`, it is split into per-entry rows on first hydrate and
 * the legacy row is deleted.
 */
export function useIDBSplitRecordState<V>(
  prefix: string,
  initial: Record<string, V> | (() => Record<string, V>),
): [Record<string, V>, React.Dispatch<React.SetStateAction<Record<string, V>>>] {
  const initialRef = useRef<Record<string, V>>();
  if (initialRef.current === undefined) {
    initialRef.current = typeof initial === 'function' ? (initial as () => Record<string, V>)() : initial;
  }

  const [state, setState] = useState<Record<string, V>>(initialRef.current as Record<string, V>);
  const hydratedRef = useRef(false);
  const prevRef = useRef<Record<string, V>>({});

  // Hydrate — migrate from legacy single-key if needed, then read split entries.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 1) Legacy single-key migration: if `prefix` itself holds a Record,
        //    split it into per-entry rows and delete the legacy row.
        const legacy = await idbGet<Record<string, V> | undefined>(prefix);
        if (legacy && typeof legacy === 'object' && !Array.isArray(legacy)) {
          const subkeys = Object.keys(legacy);
          for (const k of subkeys) {
            try { await idbSet(splitEntryKey(prefix, k), (legacy as Record<string, V>)[k]); }
            catch (err) {
              // eslint-disable-next-line no-console
              console.error(`[useIDBSplitRecordState] migrate '${prefix}:${k}' failed:`, err);
            }
          }
          try { await idbSet(splitIndexKey(prefix), subkeys); } catch { /* noop */ }
          try { await idbDel(prefix); } catch { /* noop */ }
        } else {
          // 1b) localStorage fallback (very old data path)
          const fromLS = await migrateFromLocalStorage<Record<string, V>>(prefix);
          if (fromLS && typeof fromLS === 'object') {
            const subkeys = Object.keys(fromLS);
            for (const k of subkeys) {
              try { await idbSet(splitEntryKey(prefix, k), fromLS[k]); }
              catch { /* noop */ }
            }
            try { await idbSet(splitIndexKey(prefix), subkeys); } catch { /* noop */ }
            try { await idbDel(prefix); } catch { /* noop */ }
          }
        }

        // 2) Read split entries.
        const stored = await splitRecordGetAll<V>(prefix);
        if (!cancelled) {
          if (Object.keys(stored).length > 0) {
            prevRef.current = stored;
            setState(stored);
          } else {
            // Nothing stored yet — keep initial. Mark prevRef as empty so the
            // first user-driven change writes new entries.
            prevRef.current = {};
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[useIDBSplitRecordState] hydrate failed for '${prefix}':`, err);
      } finally {
        if (!cancelled) hydratedRef.current = true;
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefix]);

  // Persist on change — diff against prev, write only added/changed entries,
  // delete removed entries. Each entry is its own transaction.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const prev = prevRef.current;
    const next = state;
    // Assume success; if writes fail we'll surface via emitWriteFailure but
    // still treat next as the latest known state so subsequent diffs are sane.
    prevRef.current = next;

    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);
    const nextSet = new Set(nextKeys);
    const toDelete = prevKeys.filter(k => !nextSet.has(k));
    const toWrite = nextKeys.filter(k => prev[k] !== next[k]);

    if (toDelete.length === 0 && toWrite.length === 0) return;

    void (async () => {
      for (const k of toWrite) {
        try {
          await idbSet(splitEntryKey(prefix, k), next[k]);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(`[useIDBSplitRecordState] persist '${prefix}:${k}' failed:`, err);
          void emitWriteFailure(prefix, err);
        }
      }
      for (const k of toDelete) {
        try { await idbDel(splitEntryKey(prefix, k)); } catch { /* noop */ }
      }
      // Refresh the index last so a write failure mid-batch doesn't leave
      // the index pointing at an entry we never wrote.
      try { await idbSet(splitIndexKey(prefix), Object.keys(next)); } catch { /* noop */ }
    })();
  }, [prefix, state]);

  return [state, setState];
}

