import { useEffect, useState } from 'react';

/**
 * Returns false for the first `delayMs` after mount, then true. Lets a tab show a
 * skeleton while its data is still loading instead of an empty state that is only
 * empty because the request has not come back yet. The contexts do not expose a
 * per-collection loading flag, so this is a time-based heuristic.
 */
export function useSettled(delayMs = 1500): boolean {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);
  return settled;
}
