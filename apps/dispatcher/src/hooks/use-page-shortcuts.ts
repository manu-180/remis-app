'use client';

import { useEffect } from 'react';
import { useShortcut } from './use-shortcut';

export interface PageShortcut {
  key: string;
  description: string;
  handler: () => void;
}

// Global registry for the shortcut help modal
type ShortcutRegistry = { page: string; shortcuts: PageShortcut[] } | null;
let currentPageShortcuts: ShortcutRegistry = null;

export function usePageShortcuts(page: string, shortcuts: PageShortcut[]): void {
  // Register shortcuts so the help modal can read them
  useEffect(() => {
    currentPageShortcuts = { page, shortcuts };
    return () => {
      currentPageShortcuts = null;
    };
  }, [page, shortcuts]);

  // Register each shortcut key
  shortcuts.forEach(({ key, handler }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useShortcut(key, handler);
  });
}

export function getCurrentPageShortcuts(): ShortcutRegistry {
  return currentPageShortcuts;
}
