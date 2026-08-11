import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import 'leaflet/dist/leaflet.css';
import { startAutoSnapshot, startAutoDownload, migrateSnapshotsStripBlobs } from './lib/snapshots';
import { runLegacyImageCompressionOnce } from './lib/legacyImageMigration';

if (!window.location.hash) {
  window.location.hash = "#/";
}

// ── Data-safety guard ─────────────────────────────────────────────────────────
// Older builds shipped one-time "migrations" that DELETED all localStorage keys
// and the IndexedDB database to force fresh seed data. That erased the user's
// real portfolio (notes, photos, QBR history) on every app update.
//
// Those destructive migrations are permanently retired. App updates must NEVER
// clear user data. Mark every legacy migration flag as complete so any cached
// old bundle that still checks them will not re-run its wipe.
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    ['cre_data_migration_v_learfield_1', 'cre_data_migration_v_learfield_2', 'cre_data_migration_v_learfield_3']
      .forEach(k => { if (!window.localStorage.getItem(k)) window.localStorage.setItem(k, String(Date.now())); });
  }
} catch { /* best-effort */ }

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
