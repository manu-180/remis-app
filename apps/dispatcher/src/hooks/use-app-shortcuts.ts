'use client';

import { useHotkeys } from 'react-hotkeys-hook';
import { useUIStore } from '@/stores/ui-store';
import { useRidesStore, useQueuedRides } from '@/stores/rides-store';

function dispatchToast(message: string) {
  window.dispatchEvent(new CustomEvent('app:toast', { detail: { message } }));
}

export function useAppShortcuts() {
  const setTheme = useUIStore((s) => s.setTheme);
  const theme = useUIStore((s) => s.theme);
  const lock = useUIStore((s) => s.lock);

  const selectedRideId = useRidesStore((s) => s.selectedRideId);
  const selectRide = useRidesStore((s) => s.selectRide);
  const queuedRides = useQueuedRides();

  useHotkeys(
    'space',
    () => {
      const el = document.getElementById('field-phone');
      el?.focus();
    },
    { preventDefault: true },
  );

  useHotkeys(
    'mod+d',
    () => {
      setTheme(theme === 'dark' ? 'light' : 'dark');
    },
    { preventDefault: true },
    [theme, setTheme],
  );

  useHotkeys(
    'mod+l',
    () => {
      lock();
    },
    { preventDefault: true },
    [lock],
  );

  useHotkeys(
    '[',
    () => {
      if (queuedRides.length === 0) return;
      const idx = queuedRides.findIndex((r) => r.id === selectedRideId);
      const prevIdx = idx <= 0 ? queuedRides.length - 1 : idx - 1;
      selectRide(queuedRides[prevIdx].id);
    },
    { preventDefault: true },
    [queuedRides, selectedRideId, selectRide],
  );

  useHotkeys(
    ']',
    () => {
      if (queuedRides.length === 0) return;
      const idx = queuedRides.findIndex((r) => r.id === selectedRideId);
      const nextIdx = idx === -1 || idx === queuedRides.length - 1 ? 0 : idx + 1;
      selectRide(queuedRides[nextIdx].id);
    },
    { preventDefault: true },
    [queuedRides, selectedRideId, selectRide],
  );

  useHotkeys(
    'f5',
    () => {
      dispatchToast('usa el botón Reconectar');
    },
    { preventDefault: true },
  );

  useHotkeys(
    'ctrl+r',
    () => {
      dispatchToast('usa el botón Reconectar');
    },
    { preventDefault: true },
  );
}

export function useF5Guard() {
  useHotkeys(
    'f5',
    () => {
      dispatchToast('usa el botón Reconectar');
    },
    { preventDefault: true },
  );

  useHotkeys(
    'ctrl+r',
    () => {
      dispatchToast('usa el botón Reconectar');
    },
    { preventDefault: true },
  );
}
