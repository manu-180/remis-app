'use client';

import { useEffect, useRef } from 'react';
import type { RealtimePostgresChangesPayload, RealtimeChannel } from '@supabase/supabase-js';
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

    let channel: RealtimeChannel = supabase.channel(channelName);

    channel = channel.on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      'postgres_changes' as any,
      {
        event,
        schema,
        table,
        ...(filter ? { filter } : {}),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload: any) => {
        callbackRef.current(payload as RealtimePostgresChangesPayload<T>);
      },
    );

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, event, filter, schema]);
}
