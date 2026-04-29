'use client';

import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(
  key: string,
  initial: T,
): [T, (v: T | ((prev: T) => T)) => void] {
  // SSR-safe: always start with initial value
  const [storedValue, setStoredValue] = useState<T>(initial);

  // After mount, read from localStorage
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        setStoredValue(JSON.parse(item) as T);
      }
    } catch {
      // ignore parse errors
    }
  }, [key]);

  const setValue = useCallback(
    (v: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next = typeof v === 'function' ? (v as (prev: T) => T)(prev) : v;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // ignore storage errors
        }
        return next;
      });
    },
    [key],
  );

  return [storedValue, setValue];
}
