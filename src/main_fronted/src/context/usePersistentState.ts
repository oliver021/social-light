import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

/**
 * `useState` whose value is mirrored to `localStorage` under `key`, JSON-serialized.
 * This is the per-slice persistence the app has always done (read on init, write on
 * change) — extracting it here lets each domain hook own its own persistence in one
 * line instead of a separate effect per key in a monolith.
 */
export function usePersistentState<T>(
  key: string,
  initial: T | (() => T),
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      try {
        return JSON.parse(saved) as T;
      } catch {
        /* corrupt entry — fall back to the initial value */
      }
    }
    return typeof initial === 'function' ? (initial as () => T)() : initial;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}
