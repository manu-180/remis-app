'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Tracks whether the initial dispatch connection/hydration is complete.
 * Pings the auth session to confirm Supabase is reachable, then waits
 * a short grace period for realtime channels to establish before clearing
 * the loading state.
 */
export function useDispatchHydration() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    supabase.auth
      .getSession()
      .then(() => {
        if (cancelled) return;
        // Grace period to let realtime channels subscribe and hydration queries fire
        timer = setTimeout(() => {
          if (!cancelled) setIsLoading(false);
        }, 600);
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
    };
  }, []);

  return { isLoading };
}
