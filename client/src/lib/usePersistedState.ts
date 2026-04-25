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
    } catch {
      // Out of quota or disabled — fail silently
    }
  }, [key, state]);

  return [state, setState];
}

export default usePersistedState;
