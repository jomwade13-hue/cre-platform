import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import 'leaflet/dist/leaflet.css';
import { startAutoSnapshot, startAutoDownload, migrateSnapshotsStripBlobs } from './lib/snapshots';
import { runLegacyImageCompressionOnce } from './lib/legacyImageMigration';

if (!window.location.hash) {
  window.location.hash = "#/";
}

// ── One-time data migration: Transcend → Learfield (April 2026) ──────────────
// Existing users have Transcend seed data cached in localStorage/IndexedDB from
// previous sessions. Clear those keys once so the new Learfield seeds load.
//
// v_learfield_3 (recovery): user manually deleted properties/notes/photos. Re-
// seed the 166-property Learfield list. Also clears recovery flags so portfolio
// cards re-restore.
try {
  const MIGRATION_KEY = 'cre_data_migration_v_learfield_3';
  if (typeof window !== 'undefined' && window.localStorage && !window.localStorage.getItem(MIGRATION_KEY)) {
    const localKeys = [
      'cre_leases', 'cre_lease_notes', 'cre_qbr_entries',
      'cre_manual_dates', 'cre_milestones', 'cre_portfolios',
      'cre_assignments', 'cre_users',
      'cre_seed_portfolio_recovery_v1', 'cre_custom_portfolio_recovery_v1',
    ];
    localKeys.forEach(k => { try { window.localStorage.removeItem(k); } catch { /* noop */ } });
    // Clear IndexedDB-backed keys (documents, photos, client logos)
    try {
      // Delete the whole IDB database — useIDBPersistedState will recreate it with seeds.
      const req = indexedDB.deleteDatabase('cre_platform');
      req.onsuccess = () => { /* deleted */ };
      req.onerror = () => { /* ignore */ };
    } catch { /* ignore */ }
    window.localStorage.setItem(MIGRATION_KEY, String(Date.now()));
  }
} catch { /* migration is best-effort */ }

// Ask the browser to mark our storage as persistent. In Chrome/Edge this
// also tends to grant a much larger quota; in Firefox it shows a one-time
// prompt the first time. Either way the answer is fine — best-effort.
try {
  if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
    navigator.storage.persist().then(granted => {
      // eslint-disable-next-line no-console
      console.info(`[storage] persistent storage ${granted ? 'granted' : 'not granted'}`);
    }).catch(() => { /* best-effort */ });
  }
} catch { /* best-effort */ }

createRoot(document.getElementById("root")!).render(<App />);

// One-time migration: strip binary blobs out of legacy snapshots. Older builds
// captured every photo/document/logo into every auto-snapshot — with 30 snapshots
// and a few MB of photos this filled the browser's IndexedDB quota and broke
// new uploads. Running this on boot reclaims that space.
try {
  migrateSnapshotsStripBlobs().then(r => {
    if (r.trimmedCount > 0) {
      // eslint-disable-next-line no-console
      console.info(`[snapshots] Reclaimed ${(r.bytesFreed / 1024 / 1024).toFixed(1)} MB from ${r.trimmedCount} legacy snapshot(s).`);
    }
  }).catch(() => { /* best-effort */ });
} catch { /* best-effort */ }

// One-time migration: recompress legacy photos/logos that were uploaded
// before upload-time compression existed. Each `cre_client_logos` /
// `cre_lease_photos` write rewrites the whole record in a single IDB
// transaction, so a few full-resolution legacy images can fail the write
// even at <1% overall quota usage. This shrinks each oversized entry in
// place and only runs once per browser.
try {
  runLegacyImageCompressionOnce().then(r => {
    if (r && (r.logosCompressed > 0 || r.photosCompressed > 0)) {
      // eslint-disable-next-line no-console
      console.info(
        `[legacy-images] Recompressed ${r.logosCompressed} logo(s) and ${r.photosCompressed} photo(s); freed ${(r.bytesFreed / 1024 / 1024).toFixed(1)} MB.`,
      );
    }
  }).catch(() => { /* best-effort */ });
} catch { /* best-effort */ }

// Auto-snapshot loop — every 30 minutes, snapshot the dashboard if data changed.
// Users can also create manual snapshots via the Version History menu.
try { startAutoSnapshot(); } catch { /* best-effort */ }

// Daily auto-download — once per day, save a JSON backup to the user's
// Downloads folder. Off-device safety net.
try { startAutoDownload(); } catch { /* best-effort */ }
