import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',

  setTheme: (theme) => {
    set({ theme });
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('chemulab_theme', theme);
    }
  },

  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    get().setTheme(next);
  },
}));

/** Call once on mount to hydrate from localStorage */
export function initThemeFromStorage() {
  if (typeof window === 'undefined') return;
  const stored = localStorage.getItem('chemulab_theme') as Theme | null;
  const theme = stored === 'dark' ? 'dark' : 'light';
  useThemeStore.getState().setTheme(theme);
}
