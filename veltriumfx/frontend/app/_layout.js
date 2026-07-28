import '../global.css';
import { Stack, usePathname, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { useEffect } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/context/AuthContext';
import { TradingProvider } from '../src/context/TradingContext';
import { ThemeProvider, useAppTheme } from '../src/context/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import SupportChat from '../src/components/common/SupportChat';


function AppStack() {
  const { darkMode, colors } = useAppTheme();
  const pathname = usePathname();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!pathname) return; // Guard against null/undefined pathname during initialization

    const hostname = window.location.hostname;
    const searchParams = new URLSearchParams(window.location.search);
    // An administrator can open a short-lived client session from the admin
    // area.  Consume it before applying domain routing so this works both in
    // local development and between the production subdomains.
    const urlToken = searchParams.get('t');
    const urlUser = searchParams.get('u');
    if (urlToken && urlUser) {
      try {
        localStorage.setItem('veltriumfx_token', JSON.stringify(urlToken));
        localStorage.setItem('veltriumfx_user', urlUser);
        const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
        window.history.replaceState(null, '', cleanUrl);
        window.location.reload();
        return;
      } catch (e) {
        console.error('Failed to save transferred session', e);
      }
    }

    // Single domain routing for all roles (Master, Manager, Agent, User)
    return;
  }, [pathname]);

  return (
    <>
      <StatusBar style={darkMode ? 'light' : 'dark'} backgroundColor={colors.background} />
      <SafeAreaView
        edges={Platform.OS === 'web' ? [] : ['top', 'right', 'bottom', 'left']}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
        <SupportChat />
      </SafeAreaView>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <ToastProvider>
            <TradingProvider>
              <AppStack />
            </TradingProvider>
          </ToastProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
