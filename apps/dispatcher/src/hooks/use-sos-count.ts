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

    const channel = supabase
      .channel('admin-sos-count')
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
