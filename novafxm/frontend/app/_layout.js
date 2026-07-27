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
        localStorage.setItem('novafxm_token', JSON.stringify(urlToken));
        localStorage.setItem('novafxm_user', urlUser);
        const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
        window.history.replaceState(null, '', cleanUrl);
        window.location.reload();
        return;
      } catch (e) {
        console.error('Failed to save transferred session', e);
      }
    }

    // Completely disable domain routing checks in local development.
    const isDev = hostname.includes('localhost') || hostname.includes('127.0.0.1');
    if (isDev) return;

    const isAdminSubdomain = hostname.startsWith('admin.');

    if (isAdminSubdomain) {
      // Standard admin routing
      if (pathname === '/' || pathname === '/index') {
        router.replace('/admin');
      } else if (
        pathname !== '/admin' && 
        pathname !== '/login' && 
        pathname !== '/register' && 
        pathname !== '/master' && 
        pathname !== '/agent' && 
        pathname !== '/manager' &&
        !pathname.startsWith('/admin/') &&
        !pathname.startsWith('/master/') &&
        !pathname.startsWith('/agent/') &&
        !pathname.startsWith('/manager/')
      ) {
        // If they are on admin subdomain but try to access main paths, redirect to main domain
        const mainDomain = isDev ? 'localhost:8081' : 'novafxm.com';
        window.location.href = `${window.location.protocol}//${mainDomain}${pathname}`;
      }
    } else {
      // 1. Check if we got a request to sync logout (Single Log-Out)
      if (searchParams.get('action') === 'logout') {
        localStorage.removeItem('novafxm_token');
        localStorage.removeItem('novafxm_user');
        
        // Clear history parameter and reload to ensure unauthenticated state
        const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
        window.history.replaceState(null, '', cleanUrl);
        window.location.reload();
        return;
      }

      // 2. If they are on the main domain but try to access admin paths, redirect to admin subdomain
      if (
        pathname === '/admin' || pathname.startsWith('/admin/') ||
        pathname === '/master' || pathname.startsWith('/master/') ||
        pathname === '/agent' || pathname.startsWith('/agent/') ||
        pathname === '/manager' || pathname.startsWith('/manager/')
      ) {
        const token = localStorage.getItem('novafxm_token');
        const user = localStorage.getItem('novafxm_user');
        
        let query = '';
        if (token && user) {
          try {
            // Retrieve actual token string (stored as JSON string)
            const tokenStr = JSON.parse(token);
            query = `?t=${encodeURIComponent(tokenStr)}&u=${encodeURIComponent(user)}`;
          } catch (e) {
            console.error("Error parsing stored token for transfer", e);
          }
        }

        const adminDomain = isDev ? 'admin.localhost:8081' : 'admin.novafxm.com';
        window.location.href = `${window.location.protocol}//${adminDomain}${pathname}${query}`;
      }
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
