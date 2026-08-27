import { Platform } from 'react-native';

export const isCrmHost = () => (
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  window.location.hostname.toLowerCase().startsWith('crm.')
);

export const isMasterHost = () => (
  isCrmHost()
  || (Platform.OS === 'web'
    && typeof window !== 'undefined'
    && ['localhost', '127.0.0.1'].includes(window.location.hostname.toLowerCase()))
);

export const landingRouteFor = (user) => {
  if (user?.role === 'master' && isMasterHost()) return '/master';
  if (user?.role === 'admin') return '/admin';
  if (isCrmHost() && user?.role === 'agent') return '/agent';
  if (isCrmHost() && user?.role === 'manager') return '/manager';
  return '/trading';
};

export const hasConsoleUi = (user) => (
  user?.role === 'admin' ||
  (isMasterHost() && user?.role === 'master') ||
  (isCrmHost() && ['agent', 'manager'].includes(user?.role))
);
