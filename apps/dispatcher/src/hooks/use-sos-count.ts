'use client';

import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export function useSosCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    async function fetchCount() {
      try {
        const { count: c } = await supabase
          .from('sos_events')
          .select('*', { count: 'exact', head: true })
          .is('resolved_at', null);
        setCount(c ?? 0);
      } catch {
        // tabla aún no existe en desarrollo
      }
    }

    void fetchCount();

    // Unique channel name per hook instance: a singleton Supabase client
    // returns the EXISTING channel when the same name is reused, which causes
    // `cannot add postgres_changes callbacks ... after subscribe()` on remount
    // (Strict Mode, SSR→CSR hydration, route transitions).
    const channelName = `admin-sos-count-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sos_events' },
        () => { void fetchCount(); }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, []);

  return count;
}
