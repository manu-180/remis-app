'use client';

import { useEffect } from 'react';

export function DarkModeProvider() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, []);

  return null;
}
