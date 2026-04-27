'use client';

import { useHotkeys } from 'react-hotkeys-hook';
import { useUIStore } from '@/stores/ui-store';

export function DensityHotkeys() {
  const setDensity = useUIStore((s) => s.setDensity);
  useHotkeys('mod+1', () => setDensity('comfortable'), { preventDefault: true });
  useHotkeys('mod+2', () => setDensity('compact'),     { preventDefault: true });
  useHotkeys('mod+3', () => setDensity('dense'),       { preventDefault: true });
  return null;
}
