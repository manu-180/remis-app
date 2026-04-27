'use client';

import { useHotkeys } from 'react-hotkeys-hook';
import { useUIStore } from '@/stores/ui-store';

export function useShortcutHelp() {
  const toggle = useUIStore((s) => s.toggleShortcutHelp);
  useHotkeys('?', toggle, { preventDefault: true });
  return useUIStore((s) => s.isShortcutHelpOpen);
}
