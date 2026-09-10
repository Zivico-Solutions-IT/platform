import { Platform } from 'react-native';

export const isCrmHost = () => (
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  (
    window.location.hostname.toLowerCase().startsWith('crm.') ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  )
);

export const isMasterHost = () => (
  isCrmHost()
);

export const landingRouteFor = (user) => {
  if (user?.role === 'master') return '/master';
  if (user?.role === 'admin') return '/admin';
  if (isCrmHost() && user?.role === 'agent') return '/agent';
  if (isCrmHost() && user?.role === 'manager') return '/manager';
  return '/trading';
};

export const hasConsoleUi = (user) => (
  user?.role === 'admin' ||
  user?.role === 'master' ||
  (isCrmHost() && ['agent', 'manager'].includes(user?.role))
);
