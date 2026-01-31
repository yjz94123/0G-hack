import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// Helper to get initial theme
const getInitialTheme = (): Theme => {
  // Check localStorage first
  const stored = localStorage.getItem('og-predict-theme');
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  // Check system preference
  if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }

  // Default to dark (current default)
  return 'dark';
};

// Helper to apply theme to DOM
const applyTheme = (theme: Theme) => {
  const root = document.documentElement;

  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  localStorage.setItem('og-predict-theme', theme);
};

export const useThemeStore = create<ThemeState>((set, get) => {
  // Initialize theme on store creation
  const initialTheme = getInitialTheme();
  applyTheme(initialTheme);

  return {
    theme: initialTheme,

    setTheme: (theme) => {
      applyTheme(theme);
      set({ theme });
    },

    toggleTheme: () => {
      const newTheme = get().theme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
      set({ theme: newTheme });
    },
  };
});
