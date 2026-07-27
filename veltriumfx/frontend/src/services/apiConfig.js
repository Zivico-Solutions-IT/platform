import Constants from 'expo-constants';
import { Platform } from 'react-native';

// VeltriumFX runs locally on port 5001 (NovaFXM master backend runs on 5000)
const API_PORT = '5001';
const PRODUCTION_API_URL = 'https://testserver.novafxm.com/api';

const normalizeApiUrl = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const isLocalApiUrl = (value) => (
  /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?(\/|$)/i.test(value || '')
);

const isLocalWebHost = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1'].includes(window.location.hostname);
};

const expoHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost;

  const cleaned = String(hostUri || '').replace(/^[a-z]+:\/\//i, '');
  return cleaned.split(':')?.[0] || null;
};

export const apiBaseUrl = () => {
  const configured = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);

  if (isLocalWebHost()) return configured || `http://localhost:${API_PORT}/api`;

  if (Platform.OS === 'web' || process.env.NODE_ENV === 'production') {
    return configured && !isLocalApiUrl(configured) ? configured : PRODUCTION_API_URL;
  }
  if (configured && !isLocalApiUrl(configured)) return configured;

  if (Platform.OS === 'web') return `http://localhost:${API_PORT}/api`;

  const host = expoHost();
  if (host) return `http://${host}:${API_PORT}/api`;
  if (Platform.OS === 'android') return `http://10.0.2.2:${API_PORT}/api`;

  return `http://${host || 'localhost'}:${API_PORT}/api`;
};

export const socketBaseUrl = () => apiBaseUrl().replace(/\/api\/?$/, '');
