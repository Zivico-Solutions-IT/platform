import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

const LEGACY_THEME_STORAGE_KEY = 'novafxm.theme';
const THEME_STORAGE_KEY = 'novafxm.theme.v2';

const palettes = {
  light: {
    mode: 'light',
    background: '#f1f1eb', // Softer, cleaner background
    panel: '#fafaf6', // The new modalBg we used
    surface: '#f3f3ef',
    border: '#e6e6e2', // The new softer border
    text: '#0B0B0B',
    muted: '#737373',
    primary: '#D4AF37',
    primarySoft: '#efe2b1',
    success: '#22c55e', // Modern green
    danger: '#f24d58', // Modern red
    chartBackground: '#ffffff',
    chartText: '#0B0B0B',
    chartGrid: 'rgba(1, 68, 33, .08)',
  },
  dark: {
    mode: 'dark',
    background: '#0b0e11',
    panel: '#12161c', // The new dark modalBg
    surface: '#1a1f26', // Slightly lighter surface
    border: '#1f242d', // The new darker border
    text: '#ffffff',
    muted: '#a1a8b5',
    primary: '#D4AF37',
    primarySoft: '#3a2f12',
    success: '#22c55e', // Modern green
    danger: '#f24d58', // Modern red
    chartBackground: '#0b0e11',
    chartText: '#ffffff',
    chartGrid: 'rgba(132, 142, 156, .12)',
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
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((storedTheme) => {
        AsyncStorage.removeItem(LEGACY_THEME_STORAGE_KEY).catch(() => {});
        if (!mounted || !storedTheme) return;
        setDarkMode(storedTheme !== 'light');
      })
      .catch(() => {});

    const checkProject = () => {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        const storedName = window.localStorage.getItem('x-project-name');
        if (storedName && storedName !== projectName) {
          setProjectName(storedName);
        }
      }
    };
    checkProject();
    const interval = setInterval(checkProject, 800);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [projectName]);

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

  const activeColors = useMemo(() => {
    const base = darkMode ? { ...palettes.dark } : { ...palettes.light };
    if (/veltrium/i.test(projectName)) {
      base.primary = '#00674F';
      base.primarySoft = darkMode ? '#0e382b' : '#d4ece4';
    }
    return base;
  }, [darkMode, projectName]);

  const value = useMemo(
    () => ({
      darkMode,
      colors: activeColors,
      setThemeMode,
      toggleTheme,
      projectName,
    }),
    [darkMode, activeColors, setThemeMode, toggleTheme, projectName],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useAppTheme = () => useContext(ThemeContext);
