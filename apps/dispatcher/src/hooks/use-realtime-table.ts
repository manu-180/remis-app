'use client';

import { useEffect, useRef } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface UseRealtimeTableOptions {
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  schema?: string;
}

export function useRealtimeTable<T extends Record<string, unknown>>(
  table: string,
  opts: UseRealtimeTableOptions,
  callback: (payload: RealtimePostgresChangesPayload<T>) => void,
): void {
  const { event = '*', filter, schema = 'public' } = opts;
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channelName = `realtime:${schema}:${table}:${event}:${filter ?? ''}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event,
          schema,
          table,
          ...(filter ? { filter } : {}),
        } as Parameters<typeof channel.on>[1],
        (payload: RealtimePostgresChangesPayload<T>) => {
          callbackRef.current(payload);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, event, filter, schema]);
}
