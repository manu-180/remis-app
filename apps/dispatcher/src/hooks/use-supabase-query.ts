'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type SupabaseBrowserClient = ReturnType<typeof getSupabaseBrowserClient>;

function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  if (value && typeof value === 'object') {
    const v = value as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts: string[] = [];
    if (typeof v.message === 'string' && v.message) parts.push(v.message);
    if (typeof v.details === 'string' && v.details) parts.push(v.details);
    if (typeof v.hint === 'string' && v.hint) parts.push(`(hint: ${v.hint})`);
    if (typeof v.code === 'string' && v.code) parts.push(`[${v.code}]`);
    if (parts.length > 0) {
      const err = new Error(parts.join(' '));
      Object.assign(err, value);
      return err;
    }
    try { return new Error(JSON.stringify(value)); } catch { /* fallthrough */ }
  }
  return new Error(String(value));
}

type QueryResult<T> = {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  refetch: () => void;
};

// Module-level simple cache: key (JSON.stringify) → data
const queryCache = new Map<string, unknown>();

export function useSupabaseQuery<T>(
  key: unknown[],
  queryFn: (
    supabase: SupabaseBrowserClient,
  ) => Promise<{ data: T | null; error: unknown }>,
  opts?: { enabled?: boolean },
): QueryResult<T> {
  const enabled = opts?.enabled !== false;
  const cacheKey = JSON.stringify(key);

  const [data, setData] = useState<T | null>(() => {
    const cached = queryCache.get(cacheKey);
    return cached !== undefined ? (cached as T) : null;
  });
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(
    enabled && !queryCache.has(cacheKey),
  );
  const [version, setVersion] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  const refetch = useCallback(() => {
    // Invalidate cache entry so next run fetches fresh
    queryCache.delete(cacheKey);
    setVersion((v) => v + 1);
  }, [cacheKey]);

  useEffect(() => {
    if (!enabled) return;

    // If we have cached data and this is not a refetch (version 0), use it
    if (version === 0 && queryCache.has(cacheKey)) {
      const cached = queryCache.get(cacheKey) as T;
      setData(cached);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const supabase = getSupabaseBrowserClient();

    queryFn(supabase).then(({ data: result, error: queryError }) => {
      if (abortController.signal.aborted) return;

      if (queryError) {
        const err = toError(queryError);
        setError(err);
        setData(null);
        Sentry.captureException(err, {
          tags: { hook: 'useSupabaseQuery' },
          extra: { cacheKey },
        });
      } else {
        queryCache.set(cacheKey, result);
        setData(result);
        setError(null);
      }
      setIsLoading(false);
    }).catch((err: unknown) => {
      if (abortController.signal.aborted) return;
      const error = toError(err);
      setError(error);
      setIsLoading(false);
      Sentry.captureException(error, {
        tags: { hook: 'useSupabaseQuery' },
        extra: { cacheKey },
      });
    });

    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, enabled, version]);

  return { data, error, isLoading, refetch };
}
