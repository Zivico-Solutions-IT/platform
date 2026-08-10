import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { apiBaseUrl } from '../services/apiConfig';
import { storage } from '../utils/storage';
import { hasConsoleUi } from '../utils/appHost';

export const AuthContext = createContext(null);

const transferredSession = (() => {
  if (typeof window === 'undefined') return null;

  if (window.name) {
    try {
      const handoff = JSON.parse(window.name);
      if (handoff?.type === 'fxm-session-handoff' &&
          handoff.targetOrigin === window.location.origin &&
          handoff.token && handoff.user) {
        window.name = '';
        localStorage.setItem('a5markets_token', JSON.stringify(handoff.token));
        localStorage.setItem('a5markets_user', JSON.stringify(handoff.user));
        return { token: handoff.token, user: handoff.user };
      }
    } catch {
      // Ignore window names created by unrelated browser pages.
    }
  }

  // Backward compatibility for links created by an older deployed frontend.
  const params = new URLSearchParams(window.location.search);
  const token = params.get('t');
  const encodedUser = params.get('u');
  if (!token || !encodedUser) return null;
  try {
    const user = JSON.parse(encodedUser);
    localStorage.setItem('a5markets_token', JSON.stringify(token));
    localStorage.setItem('a5markets_user', encodedUser);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
    return { token, user };
  } catch {
    return null;
  }
})();

const mergeUser = (incoming, fallback = null) => {
  if (!incoming && !fallback) return null;
  const merged = { ...(fallback || {}), ...(incoming || {}) };
  if (incoming?.role === 'master' && fallback?.role === 'master') {
    ['name', 'email', 'profileImage'].forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(fallback, field)) merged[field] = fallback[field];
    });
  }
  if (incoming && !Object.prototype.hasOwnProperty.call(incoming, 'dateOfBirth')) merged.dateOfBirth = fallback?.dateOfBirth || '';
  if (incoming && !Object.prototype.hasOwnProperty.call(incoming, 'profileImage')) merged.profileImage = fallback?.profileImage || null;
  return merged;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(transferredSession?.user || null);
  const [sessionToken, setSessionToken] = useState(transferredSession?.token || null);
  const [loading, setLoading] = useState(!transferredSession);

  useEffect(() => {
    async function restore() {
      const [savedUser, token] = await Promise.all([storage.get('user'), storage.get('token')]);
      if (savedUser && token) {
        setSessionToken(token);
        setUser(savedUser);
        // Render cached profile details immediately. A slow network refresh
        // must not keep the entire portal on its loading screen.
        setLoading(false);
        try {
          const current = await authService.me();
          const restoredUser = mergeUser(current.user, savedUser);
          setUser(restoredUser);
          await storage.set('user', restoredUser);
        } catch (requestError) {
          if (requestError.response?.status === 401) {
            await storage.clearSession();
            setSessionToken(null);
            setUser(null);
            return;
          }
          setUser(savedUser);
        }
      }
      setLoading(false);
    }
    restore();
  }, []);

  const storeSession = useCallback(async (result) => {
    await Promise.all([storage.set('token', result.token), storage.set('user', result.user)]);
    setSessionToken(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const login = useCallback(async (values) => {
    const result = await authService.login(values);
    return storeSession(result);
  }, [storeSession]);
  const register = useCallback(async (values) => storeSession(await authService.register(values)), [storeSession]);

  const logout = useCallback(async () => {
    try {
      await authService.offline();
    } catch {}
    await storage.clearSession();
    setSessionToken(null);
    setUser(null);

    // If logging out on web from the admin subdomain, sync logout to the main domain
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname;
      const isDev = hostname.includes('localhost') || hostname.includes('127.0.0.1');
      
      // Only sync subdomain logouts in production
      if (!isDev) {
        const isAdminSubdomain = hostname.startsWith('admin.');
        if (isAdminSubdomain) {
          const mainDomain = 'a5markets.com';
          window.location.href = `${window.location.protocol}//${mainDomain}?action=logout`;
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!user || !sessionToken) return undefined;

    const markOnline = () => authService.presence().catch(() => {});
    markOnline();
    const interval = setInterval(markOnline, 15000);

    const markOffline = () => {
      if (typeof fetch !== 'function') return;
      fetch(`${apiBaseUrl()}/auth/offline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
        body: '{}',
        keepalive: true,
      }).catch(() => {});
    };

    const supportsWindowEvents = (
      typeof window !== 'undefined' &&
      typeof window.addEventListener === 'function' &&
      typeof window.removeEventListener === 'function'
    );

    if (supportsWindowEvents) {
      window.addEventListener('pagehide', markOffline);
      window.addEventListener('beforeunload', markOffline);
    }

    return () => {
      clearInterval(interval);
      if (supportsWindowEvents) {
        window.removeEventListener('pagehide', markOffline);
        window.removeEventListener('beforeunload', markOffline);
      }
    };
  }, [sessionToken, user]);

  const updateProfile = useCallback(async (values) => {
    const result = await authService.updateProfile(values);
    const nextUser = mergeUser({ ...(user || {}), ...result.user, ...values });
    setUser(nextUser);
    await storage.set('user', nextUser);
    return nextUser;
  }, [user]);

  const refreshUser = useCallback(async () => {
    const current = await authService.me();
    const nextUser = mergeUser(current.user, user);
    setUser(nextUser);
    await storage.set('user', nextUser);
    return nextUser;
  }, [user]);

  const submitVerification = useCallback(async (values) => {
    const result = await authService.submitVerification(values);
    setUser(result.user);
    await storage.set('user', result.user);
    return result.user;
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, updateProfile, submitVerification, refreshUser, isAdmin: hasConsoleUi(user), isMaster: user?.role === 'master' }),
    [user, loading, login, register, logout, updateProfile, submitVerification, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
