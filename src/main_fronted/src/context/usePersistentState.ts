import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

/** Storage key recording which user the cached `nexus_*` data belongs to. */
export const OWNER_KEY = 'nexus_owner';

/** Browser-wide preference that survives logout (not per-user data). */
const SHARED_KEYS = ['nexus_dark_mode'];

/** Read a localStorage value, returning null when storage is unavailable (private windows). */
export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Write a localStorage value; a full or unavailable storage just means nothing is cached. */
export function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage full or unavailable: the value simply is not cached this time */
  }
}

/**
 * Remove every cached per-user `nexus_*` entry (profile, chats, notifications, groups,
 * market drafts, posts, owner marker). Called on logout and whenever the signed-in user
 * differs from the owner of the cache, so one account never sees another's local data.
 */
export function clearUserScopedStorage(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('nexus_') && !SHARED_KEYS.includes(k)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage unavailable: nothing was cached */
  }
}

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
    const saved = readStored(key);
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
    writeStored(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}
