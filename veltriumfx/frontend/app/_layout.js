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
    // Cross-domain master switching uses window.name so credentials never
    // appear in the URL, browser history, access logs, or referrer headers.
    if (window.name) {
      try {
        const handoff = JSON.parse(window.name);
        if (handoff?.type === 'fxm-session-handoff' &&
            handoff.targetOrigin === window.location.origin &&
            handoff.token && handoff.user) {
          window.name = '';
          localStorage.setItem('veltriumfx_token', JSON.stringify(handoff.token));
          localStorage.setItem('veltriumfx_user', JSON.stringify(handoff.user));
          window.location.reload();
          return;
        }
      } catch (e) {
        // Ignore window names created by unrelated browser pages.
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
