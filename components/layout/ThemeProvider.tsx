'use client';

import { useEffect } from 'react';
import { initThemeFromStorage } from '@/store/theme-store';

/**
 * Hydrates the theme from localStorage on mount.
 * Must be rendered inside the client tree.
 */
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initThemeFromStorage();
  }, []);

  return <>{children}</>;
}
