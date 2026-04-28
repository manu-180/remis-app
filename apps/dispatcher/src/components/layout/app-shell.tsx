'use client';

import { useEffect, useRef } from 'react';
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

export function AppShell({ children }: { children?: React.ReactNode }) {
  const previousIdsRef = useRef<Set<string>>(new Set());
  const blinkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      className="grid h-screen overflow-hidden"
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
    </div>
  );
}
