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
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB unavailable'));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
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
  } catch {
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
      try {
        const flagKey = `__idb_warned_${key}`;
        if (!(window as any)[flagKey]) {
          (window as any)[flagKey] = true;
          window.alert(
            `Storage write failed while saving '${key}'. ` +
            'Your browser may be near its storage quota — try removing older photos or documents.'
          );
        }
      } catch { /* noop */ }
    });
  }, [key, state]);

  return [state, setState];
}

export default useIDBPersistedState;
