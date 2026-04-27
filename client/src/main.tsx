import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import 'leaflet/dist/leaflet.css';

if (!window.location.hash) {
  window.location.hash = "#/";
}

// ── One-time data migration: Transcend → Learfield (April 2026) ──────────────
// Existing users have Transcend seed data cached in localStorage/IndexedDB from
// previous sessions. Clear those keys once so the new Learfield seeds load.
try {
  const MIGRATION_KEY = 'cre_data_migration_v_learfield_1';
  if (typeof window !== 'undefined' && window.localStorage && !window.localStorage.getItem(MIGRATION_KEY)) {
    const localKeys = [
      'cre_leases', 'cre_lease_notes', 'cre_qbr_entries',
      'cre_manual_dates', 'cre_milestones', 'cre_portfolios',
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

createRoot(document.getElementById("root")!).render(<App />);
