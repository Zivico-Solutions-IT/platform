import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const LEGACY_THEME_STORAGE_KEY = 'novafxm.theme';
const THEME_STORAGE_KEY = 'veltriumfx.theme.v1';

// VeltriumFX brand palette
// Primary: #00A67E (Emerald) | Secondary: #C9A646 (Champagne Gold)
const palettes = {
  light: {
    mode: 'light',
    background: '#eef5f2',
    panel: '#ffffff',
    surface: '#e7f0ed',
    border: '#c3d8d2',
    text: '#10201d',
    muted: '#60756f',
    primary: '#00A67E',
    secondary: '#C9A646',
    primarySoft: '#c8efe5',
    success: '#22c55e',
    danger: '#f24d58',
    chartBackground: '#ffffff',
    chartText: '#10201d',
    chartGrid: 'rgba(0, 166, 126, .10)',
  },
  dark: {
    mode: 'dark',
    background: '#07100f',
    panel: '#0d1818',
    surface: '#132323',
    border: '#24413d',
    text: '#f4faf8',
    muted: '#93aaa4',
    primary: '#00C896',
    secondary: '#D7B75A',
    primarySoft: '#123b33',
    success: '#22c55e',
    danger: '#f24d58',
    chartBackground: '#07100f',
    chartText: '#f4faf8',
    chartGrid: 'rgba(0, 200, 150, .16)',
  },
};

const ThemeContext = createContext({
  darkMode: false,
  colors: palettes.light,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((storedTheme) => {
        AsyncStorage.removeItem(LEGACY_THEME_STORAGE_KEY).catch(() => {});
        if (!mounted || !storedTheme) return;
        setDarkMode(storedTheme !== 'light');
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', darkMode);
      document.body.style.backgroundColor = darkMode ? palettes.dark.background : palettes.light.background;
    }
  }, [darkMode]);

  const setThemeMode = useCallback((mode) => {
    const nextDarkMode = mode === 'dark';
    setDarkMode(nextDarkMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, nextDarkMode ? 'dark' : 'light').catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setDarkMode((enabled) => {
      const nextDarkMode = !enabled;
      AsyncStorage.setItem(THEME_STORAGE_KEY, nextDarkMode ? 'dark' : 'light').catch(() => {});
      return nextDarkMode;
    });
  }, []);

  const value = useMemo(
    () => ({
      darkMode,
      colors: darkMode ? palettes.dark : palettes.light,
      setThemeMode,
      toggleTheme,
    }),
    [darkMode, setThemeMode, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useAppTheme = () => useContext(ThemeContext);
