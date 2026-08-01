import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner, { LOADING_SPINNER_MIN_MS } from '../common/LoadingSpinner';
import { landingRouteFor } from '../../utils/appHost';

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
    const landingRoute = landingRouteFor(user);
    if (landingRoute !== '/trading') return <Redirect href={landingRoute} />;
  }

  return children;
}
