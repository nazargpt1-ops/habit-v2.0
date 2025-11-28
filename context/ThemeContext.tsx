import React, { createContext, useContext, useEffect, useState, PropsWithChildren } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    // 1. Check local storage
    const savedTheme = localStorage.getItem('habitflow-theme') as Theme;
    
    // 2. Check system preference
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
      setThemeState(savedTheme);
      applyTheme(savedTheme);
    } else if (systemPrefersDark) {
      setThemeState('dark');
      applyTheme('dark');
    } else {
      applyTheme('light');
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      // Update Telegram header if available
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.setHeaderColor('#0F172A');
        window.Telegram.WebApp.setBackgroundColor('#0F172A');
      }
    } else {
      document.documentElement.classList.remove('dark');
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.setHeaderColor('#F8FAFC');
        window.Telegram.WebApp.setBackgroundColor('#F8FAFC');
      }
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setThemeState(newTheme);
    localStorage.setItem('habitflow-theme', newTheme);
    applyTheme(newTheme);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('habitflow-theme', newTheme);
    applyTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};
