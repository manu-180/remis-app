'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { playSosSound, stopSosSound } from '@/lib/sounds';
import { toast } from '@/components/ui/use-toast';
import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Mini store — active SOS count (for sidebar badge, etc.)
// ---------------------------------------------------------------------------
interface SosStore {
  activeCount: number;
  setActiveCount: (n: number) => void;
  increment: () => void;
}

export const useSosStore = create<SosStore>((set) => ({
  activeCount: 0,
  setActiveCount: (n) => set({ activeCount: n }),
  increment: () => set((s) => ({ activeCount: s.activeCount + 1 })),
}));

// ---------------------------------------------------------------------------
// Hook — mount once in AdminShell
// ---------------------------------------------------------------------------
export function useSosWatcher() {
  // router available for potential navigation (not used directly here but
  // keeps the hook signature consistent with the spec)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // Initial active SOS count
    void (async () => {
      try {
        const { count } = await supabase
          .from('sos_events')
          .select('id', { count: 'exact', head: true })
          .is('resolved_at', null);

        useSosStore.getState().setActiveCount(count ?? 0);

        // If there are active SOS when dispatcher opens, start the alarm
        if ((count ?? 0) > 0) {
          playSosSound();
        }
      } catch {
        // table may not exist in dev
      }
    })();

    const channel = supabase
      .channel('sos-watcher')
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'sos_events' },
        (payload: { new: Record<string, unknown> }) => {
          const sos = payload.new;

          useSosStore.getState().increment();
          playSosSound();

          // Persistent error toast (no auto-dismiss for critical alerts)
          toast.error(
            `🚨 SOS activo — ${String(sos['triggered_role'] ?? 'desconocido')}`,
          );

          // Browser notification if tab is hidden
          if (
            document.hidden &&
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            new Notification('🚨 SOS Activo', {
              body: `Emergencia activada por ${String(sos['triggered_role'] ?? 'desconocido')}`,
              icon: '/favicon.ico',
            });
          }

          // Flashing title bar when tab is hidden
          if (document.hidden) {
            let alternate = true;
            const originalTitle = document.title;
            const interval = setInterval(() => {
              document.title = alternate ? '🚨 SOS ACTIVO' : 'RemisDespacho';
              alternate = !alternate;
            }, 500);

            const stopFlash = () => {
              if (!document.hidden) {
                clearInterval(interval);
                document.title = originalTitle;
              }
            };
            document.addEventListener('visibilitychange', stopFlash, { once: true });
          }
        },
      )
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: 'UPDATE', schema: 'public', table: 'sos_events' },
        (payload: { new: Record<string, unknown> }) => {
          const sos = payload.new;

          // If a SOS was resolved, decrement the count
          if (sos['resolved_at']) {
            useSosStore.setState((s) => ({
              activeCount: Math.max(0, s.activeCount - 1),
            }));

            // Stop alarm only when no more active SOS remain
            if (useSosStore.getState().activeCount === 0) {
              stopSosSound();
            }
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
      stopSosSound();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
