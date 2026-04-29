'use client';

import { useHotkeys } from 'react-hotkeys-hook';

interface UseShortcutOptions {
  enabled?: boolean;
}

export function useShortcut(
  combo: string,
  handler: (e: KeyboardEvent) => void,
  opts?: UseShortcutOptions,
): void {
  const enabled = opts?.enabled !== false;
  // mod+ combos use enableOnFormTags so they work inside inputs/textareas
  const isModCombo = combo.toLowerCase().startsWith('mod+');

  useHotkeys(
    combo,
    handler,
    {
      enabled,
      enableOnFormTags: isModCombo,
      preventDefault: true,
    },
  );
}
