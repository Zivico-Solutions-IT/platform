import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const LEGACY_THEME_STORAGE_KEY = 'novafxm.theme';
const THEME_STORAGE_KEY = 'veltriumfx.theme.v1';

// VeltriumFX brand palette
// Primary: #00674F (Emerald Green) | Secondary: #D3D3D3 (Silver)
const palettes = {
  light: {
    mode: 'light',
    background: '#f0f7f5',
    panel: '#ffffff',
    surface: '#e8f5f1',
    border: '#b8d9cf',
    text: '#0a1f18',
    muted: '#4a7a68',
    primary: '#00674F',
    secondary: '#D3D3D3',
    primarySoft: '#b8e4d8',
    success: '#22c55e',
    danger: '#f24d58',
    chartBackground: '#ffffff',
    chartText: '#0a1f18',
    chartGrid: 'rgba(0, 103, 79, .08)',
  },
  dark: {
    mode: 'dark',
    background: '#060d0a',
    panel: '#0d1a16',
    surface: '#112319',
    border: '#1a3328',
    text: '#f0f7f5',
    muted: '#7a9e94',
    primary: '#00674F',
    secondary: '#D3D3D3',
    primarySoft: '#0d2e23',
    success: '#22c55e',
    danger: '#f24d58',
    chartBackground: '#060d0a',
    chartText: '#f0f7f5',
    chartGrid: 'rgba(0, 103, 79, .15)',
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
