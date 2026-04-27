import { useEffect, useRef, useState } from 'react';

/**
 * usePersistedState
 * ----------------------------------------------------------------
 * Drop-in replacement for useState that persists the value to
 * localStorage under `key`. Survives sign-out and page reloads.
 *
 * - Reads the initial value from localStorage on first render
 *   (falling back to `initial` when no stored value exists).
 * - Writes back to localStorage on every change.
 * - Safely no-ops in environments where localStorage is unavailable
 *   (e.g. sandboxed iframes, SSR).
 */
export function usePersistedState<T>(
  key: string,
  initial: T | (() => T),
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const initialRef = useRef<T>();
  if (initialRef.current === undefined) {
    initialRef.current = typeof initial === 'function' ? (initial as () => T)() : initial;
  }

  const [state, setState] = useState<T>(() => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return initialRef.current as T;
      const raw = window.localStorage.getItem(key);
      if (raw == null) return initialRef.current as T;
      return JSON.parse(raw) as T;
    } catch {
      return initialRef.current as T;
    }
  });

  useEffect(() => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (err) {
      // Most common cause: QuotaExceededError from oversized images.
      // Log so it shows up in the console; alert once so the user knows uploads weren't saved.
      // eslint-disable-next-line no-console
      console.error(`[usePersistedState] failed to persist '${key}':`, err);
      try {
        const flagKey = `__persist_warned_${key}`;
        if (!(window as any)[flagKey]) {
          (window as any)[flagKey] = true;
          window.alert(
            `Storage limit reached while saving '${key}'. Recent uploads may not survive a sign-out. ` +
            'Try removing older photos or uploading smaller images.'
          );
        }
      } catch { /* noop */ }
    }
  }, [key, state]);

  return [state, setState];
}

export default usePersistedState;
