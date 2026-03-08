import { useState, useEffect } from 'react';

export const useTheme = () => {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('addhoom-theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('addhoom-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return { dark, toggleTheme: () => setDark(d => !d) };
};
