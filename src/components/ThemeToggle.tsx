import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-6 left-6 z-[9999] w-10 h-10 flex items-center justify-center bg-[var(--card-bg)] backdrop-blur-lg rounded-xl shadow-xl border border-[var(--card-border)] text-indigo-500 hover:scale-110 transition-all group"
      title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 group-hover:rotate-45 transition-transform" />
      ) : (
        <Moon className="w-5 h-5 group-hover:-rotate-12 transition-transform" />
      )}
    </button>
  );
}
