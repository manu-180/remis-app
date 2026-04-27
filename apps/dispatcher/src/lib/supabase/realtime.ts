'use client';

import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from './client';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

let dispatchChannel: RealtimeChannel | null = null;
let statusListeners: Array<(s: ConnectionStatus) => void> = [];

export function subscribeToConnectionStatus(cb: (s: ConnectionStatus) => void) {
  statusListeners.push(cb);
  return () => {
    statusListeners = statusListeners.filter((l) => l !== cb);
  };
}

function notifyStatus(s: ConnectionStatus) {
  statusListeners.forEach((l) => l(s));
}

export function getDispatchChannel(): RealtimeChannel {
  if (dispatchChannel) return dispatchChannel;

  const supabase = getSupabaseBrowserClient();
  notifyStatus('connecting');

  dispatchChannel = supabase.channel('dispatch:public', {
    config: { broadcast: { self: false } },
  });

  dispatchChannel
    .on('system', {} as never, (payload) => {
      if ((payload as { extension?: string }).extension === 'postgres_changes') return;
      notifyStatus('connected');
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') notifyStatus('connected');
      if (status === 'CLOSED' || status === 'CHANNEL_ERROR') notifyStatus('disconnected');
    });

  return dispatchChannel;
}

export function teardownRealtimeChannels() {
  if (dispatchChannel) {
    dispatchChannel.unsubscribe();
    dispatchChannel = null;
  }
  // Reset listeners to prevent accumulation on HMR (Next.js Fast Refresh re-evaluates modules)
  statusListeners = [];
}
