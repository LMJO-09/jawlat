import React from 'react';
import { Sun, Moon, TreePine, Crown } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-6 left-6 z-[9999] w-12 h-12 flex items-center justify-center bg-[var(--card-bg)] backdrop-blur-lg rounded-2xl shadow-2xl border border-[var(--card-border)] text-[var(--accent-primary)] hover:scale-110 transition-all group"
      title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
    >
      {theme === 'dark' ? (
        <Sun className="w-6 h-6 group-hover:rotate-45 transition-transform" />
      ) : (
        <Moon className="w-6 h-6 group-hover:-rotate-12 transition-transform" />
      )}
    </button>
  );
}
