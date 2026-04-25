import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

// DATABASE_PATH is set in production (e.g. Railway: /app/data/data.db on a persistent volume).
// Falls back to ./data.db for local development.
const dbPath = process.env.DATABASE_PATH || 'data.db';

// Ensure the parent directory exists (important for /app/data on Railway).
try {
  mkdirSync(dirname(dbPath), { recursive: true });
} catch {}

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite);
