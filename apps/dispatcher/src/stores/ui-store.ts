'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Density = 'comfortable' | 'compact' | 'dense';
export type Theme = 'dark' | 'light';

interface UIState {
  density: Density;
  theme: Theme;
  isCommandPaletteOpen: boolean;
  isShortcutHelpOpen: boolean;

  setDensity: (d: Density) => void;
  setTheme: (t: Theme) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleShortcutHelp: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      density: 'dense',
      theme: 'dark',
      isCommandPaletteOpen: false,
      isShortcutHelpOpen: false,

      setDensity: (density) => {
        set({ density });
        document.documentElement.dataset['density'] = density;
      },
      setTheme: (theme) => {
        set({ theme });
        document.documentElement.dataset['theme'] = theme;
      },
      openCommandPalette: () => set({ isCommandPaletteOpen: true }),
      closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
      toggleShortcutHelp: () =>
        set((s) => ({ isShortcutHelpOpen: !s.isShortcutHelpOpen })),
    }),
    {
      name: 'dispatcher-ui',
      partialize: (s) => ({ density: s.density, theme: s.theme }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.dataset['density'] = state.density;
          document.documentElement.dataset['theme'] = state.theme;
        }
      },
    },
  ),
);
