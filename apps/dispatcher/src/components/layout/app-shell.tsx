'use client';

import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { TopBar }       from './top-bar';
import { LeftColumn }   from './left-column';
import { CenterColumn } from './center-column';
import { RightColumn }  from './right-column';
import { BottomBar }    from './bottom-bar';
import { useRidesStore } from '@/stores/rides-store';
import { playNewRideSound, registerAudioGesture } from '@/lib/sounds';
import { useBroadcastSync } from '@/hooks/use-broadcast-sync';
import { useAppShortcuts } from '@/hooks/use-app-shortcuts';
import { useBrowserNotifications } from '@/hooks/use-browser-notifications';
import { useDispatchHydration } from '@/hooks/use-dispatch-hydration';

export function AppShell({ children }: { children?: React.ReactNode }) {
  const previousIdsRef = useRef<Set<string>>(new Set());
  const blinkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { isLoading } = useDispatchHydration();

  useBroadcastSync('primary');
  useAppShortcuts();
  const { requestPermission } = useBrowserNotifications();

  useEffect(() => {
    void requestPermission();
  }, [requestPermission]);

  useEffect(() => {
    const handler = () => {
      registerAudioGesture();
      window.removeEventListener('click', handler);
    };
    window.addEventListener('click', handler, { once: true });
    return () => window.removeEventListener('click', handler);
  }, []);

  useEffect(() => {
    const initial = useRidesStore.getState().rides;
    initial.forEach((_, id) => previousIdsRef.current.add(id));

    const stopBlink = () => {
      if (blinkIntervalRef.current !== null) {
        clearInterval(blinkIntervalRef.current);
        blinkIntervalRef.current = null;
        document.title = 'RemisDespacho';
      }
    };

    const startBlink = () => {
      if (blinkIntervalRef.current !== null) return;
      let toggle = false;
      blinkIntervalRef.current = setInterval(() => {
        document.title = toggle ? 'RemisDespacho' : '(NUEVO) RemisDespacho';
        toggle = !toggle;
      }, 800);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) stopBlink();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const unsubscribe = useRidesStore.subscribe((state) => {
      const currentIds = state.rides;
      const prev = previousIdsRef.current;

      currentIds.forEach((ride, id) => {
        if (!prev.has(id) && ride.status === 'requested') {
          playNewRideSound();
          if (document.hidden) startBlink();
        }
      });

      const next = new Set<string>();
      currentIds.forEach((_, id) => next.add(id));
      previousIdsRef.current = next;
    });

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopBlink();
    };
  }, []);

  return (
    <div
      className="relative grid h-screen overflow-hidden"
      style={{
        gridTemplateColumns: '280px 1fr 360px',
        gridTemplateRows: '56px 1fr 44px',
      }}
    >
      <TopBar />
      <LeftColumn />
      <CenterColumn />
      <RightColumn />
      <BottomBar />
      {children}

      {/* Loading overlay — fades out once realtime channels are ready */}
      <div
        className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 backdrop-blur-sm transition-opacity duration-500"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--neutral-0) 60%, transparent)',
          opacity: isLoading ? 1 : 0,
        }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
        <span className="text-sm font-medium text-[var(--neutral-600)]">
          Conectando con el servidor...
        </span>
      </div>
    </div>
  );
}
