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

// Ensure tables exist at runtime. drizzle-kit's `db:push` only targets the
// configured DATABASE_PATH; if we fall back to /tmp or :memory: (or run before
// a push), these CREATE IF NOT EXISTS statements keep auth working.
export function ensureSchema(): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT,
      role TEXT NOT NULL DEFAULT 'client',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS portfolios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      client_name TEXT,
      market TEXT,
      status TEXT NOT NULL DEFAULT 'Active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS portfolio_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      portfolio_id INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'viewer',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, portfolio_id)
    );
  `);
}
