import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../stores';

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-800 transition-colors"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-dark-400 hover:text-white transition-colors" />
      ) : (
        <Moon className="w-4 h-4 text-gray-600 hover:text-gray-900 transition-colors" />
      )}
    </button>
  );
}
