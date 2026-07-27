import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner, { LOADING_SPINNER_MIN_MS } from '../common/LoadingSpinner';

export default function RequireAuth({ children, redirectAdmin = false }) {
  const { user, loading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), LOADING_SPINNER_MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  if (loading || !splashDone) {
    return <LoadingSpinner />;
  }

  if (!user) return <Redirect href="/login" />;
  if (redirectAdmin) {
    if (user.role === 'master') return <Redirect href="/master" />;
    if (['admin', 'agent'].includes(user.role)) return <Redirect href="/admin" />;
  }

  return children;
}
