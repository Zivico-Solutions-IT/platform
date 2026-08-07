import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const LEGACY_THEME_STORAGE_KEY = 'a5markets.theme';
const THEME_STORAGE_KEY = 'a5markets.theme.v2';

const palettes = {
  light: {
    mode: 'light',
    background: '#eef6f9',
    panel: '#ffffff',
    surface: '#f7fbfd',
    border: '#bfd9e3',
    text: '#102b4e',
    muted: '#58738b',
    primary: '#2c79bb',
    primarySoft: '#dbeefa',
    accent: '#17b8b2',
    success: '#0c9f91',
    danger: '#e64f64',
    chartBackground: '#ffffff',
    chartText: '#102b4e',
    chartGrid: 'rgba(21, 63, 115, .10)',
  },
  dark: {
    mode: 'dark',
    background: '#071525',
    panel: '#0d2239',
    surface: '#12304d',
    border: '#214d69',
    text: '#f3fbff',
    muted: '#8faabd',
    primary: '#2c79bb',
    primarySoft: '#153b59',
    accent: '#2c79bb',
    success: '#36d0cb',
    danger: '#ff6577',
    chartBackground: '#071525',
    chartText: '#ffffff',
    chartGrid: 'rgba(54, 208, 203, .12)',
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
      if (typeof window !== 'undefined') {
        const storedName = localStorage.getItem('x-project-name');
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
    // A5 Markets owns this build; do not inherit NovaFXM/Veltrium palettes.
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
