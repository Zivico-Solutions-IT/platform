import { Platform } from 'react-native';

export const isCrmHost = () => (
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  window.location.hostname.toLowerCase().startsWith('crm.')
);

export const isMasterHost = () => (
  isCrmHost()
);

const currentHostname = () => (
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.hostname.toLowerCase()
    : ''
);

export const isPortalHost = () => currentHostname() === 'portal.a5markets.com';
export const isPlatformHost = () => currentHostname() === 'platform.a5markets.com';

const appOrigin = (app) => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return '';
  const hostname = currentHostname();
  if (hostname === 'localhost' || hostname === '127.0.0.1') return window.location.origin;
  return app === 'portal' ? 'https://portal.a5markets.com' : 'https://platform.a5markets.com';
};

export const navigateToA5App = (app, path = '/', localRouter) => {
  const route = path.startsWith('/') ? path : `/${path}`;
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    localRouter?.push?.(route);
    return;
  }

  const origin = appOrigin(app);
  if (!origin || origin === window.location.origin) {
    if (localRouter?.push) localRouter.push(route);
    else window.location.assign(route);
    return;
  }

  try {
    const token = JSON.parse(window.localStorage.getItem('a5markets_token') || 'null');
    const user = JSON.parse(window.localStorage.getItem('a5markets_user') || 'null');
    if (token && user) {
      window.name = JSON.stringify({
        type: 'fxm-session-handoff',
        targetOrigin: origin,
        token,
        user,
      });
    }
  } catch {
    // Navigation still works; the destination will request login if needed.
  }
  window.location.assign(`${origin}${route}`);
};

export const landingRouteFor = (user) => {
  if (user?.role === 'master' && isMasterHost()) return '/master';
  if (user?.role === 'admin') return '/admin';
  if (isCrmHost() && user?.role === 'agent') return '/agent';
  if (isCrmHost() && user?.role === 'manager') return '/manager';
  if (isPortalHost()) return '/dashboard';
  return '/trading';
};

export const hasConsoleUi = (user) => (
  user?.role === 'admin' ||
  (isMasterHost() && user?.role === 'master') ||
  (isCrmHost() && ['agent', 'manager'].includes(user?.role))
);
