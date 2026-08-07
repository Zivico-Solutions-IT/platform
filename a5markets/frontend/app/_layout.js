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

    const hostname = window.location.hostname.toLowerCase();
    if (hostname === 'portal.a5markets.com' && pathname === '/') {
      router.replace('/dashboard');
    }
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
