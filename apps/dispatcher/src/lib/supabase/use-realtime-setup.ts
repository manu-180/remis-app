'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from './client';
import { setupRealtimeChannels, teardownRealtimeChannels } from './realtime';

/**
 * Initialises agency-scoped Supabase Realtime channels on mount and tears them
 * down on unmount. Reads agency_id from the authenticated user's metadata.
 *
 * @returns `{ isReady }` — true once channels have been set up.
 */
export function useRealtimeSetup(): { isReady: boolean } {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      // Prefer app_metadata (server-set) then user_metadata; fall back to
      // 'default' for local development without a real auth session.
      const agencyId: string =
        (user?.app_metadata?.agency_id as string | undefined) ??
        (user?.user_metadata?.agency_id as string | undefined) ??
        'default';

      if (cancelled) return;

      setupRealtimeChannels(agencyId);
      setIsReady(true);
    }

    init().catch(console.error);

    return () => {
      cancelled = true;
      teardownRealtimeChannels();
      setIsReady(false);
    };
  }, []);

  return { isReady };
}
