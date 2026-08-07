'use client';

import { useCallback, useState } from 'react';

/**
 * Lightweight undo/redo for immutable state snapshots.
 */
export function useHistoryState<T>(initial: T, limit = 40) {
  const [present, setPresent] = useState<T>(initial);
  const [past, setPast] = useState<T[]>([]);
  const [future, setFuture] = useState<T[]>([]);

  const commit = useCallback(
    (next: T | ((prev: T) => T)) => {
      setPresent((prev) => {
        const value = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        setPast((p) => [...p.slice(-(limit - 1)), prev]);
        setFuture([]);
        return value;
      });
    },
    [limit],
  );

  const replace = useCallback((next: T) => {
    setPast([]);
    setFuture([]);
    setPresent(next);
  }, []);

  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      const previous = p[p.length - 1]!;
      setPresent((cur) => {
        setFuture((f) => [cur, ...f]);
        return previous;
      });
      return p.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0]!;
      setPresent((cur) => {
        setPast((p) => [...p, cur]);
        return next;
      });
      return f.slice(1);
    });
  }, []);

  return {
    state: present,
    setState: commit,
    replaceState: replace,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
