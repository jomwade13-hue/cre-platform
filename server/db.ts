import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

// DATABASE_PATH is set in production (e.g. Railway: /app/data/data.db on a persistent volume).
// Falls back to ./data.db for local development.
const preferredPath = process.env.DATABASE_PATH || 'data.db';

// Try the configured path first, then fall back to /tmp, then in-memory.
// This keeps the server up even if the persistent volume is unavailable —
// the React client stores its data in localStorage/IndexedDB anyway, so the
// app remains usable while we sort out persistent storage.
function openDatabase(): Database.Database {
  const candidates = [preferredPath, '/tmp/data.db', ':memory:'];
  for (const path of candidates) {
    try {
      if (path !== ':memory:') {
        try { mkdirSync(dirname(path), { recursive: true }); } catch {}
      }
      const db = new Database(path);
      if (path !== ':memory:') {
        try { db.pragma('journal_mode = WAL'); } catch {}
      }
      if (path !== preferredPath) {
        console.warn(`[db] Could not open ${preferredPath}, using ${path} instead`);
      }
      return db;
    } catch (err) {
      console.error(`[db] Failed to open ${path}:`, (err as Error).message);
    }
  }
  // Last-resort guarantee — better-sqlite3's in-memory open should never fail.
  return new Database(':memory:');
}

const sqlite = openDatabase();

export const db = drizzle(sqlite);
