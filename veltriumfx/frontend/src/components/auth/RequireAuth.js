import { Redirect } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { landingRouteFor } from '../../utils/appHost';

export default function RequireAuth({ children, redirectAdmin = false }) {
  const { user, loading } = useAuth();
  if (loading) return null;

  if (!user) return <Redirect href="/login" />;
  if (redirectAdmin) {
    const landingRoute = landingRouteFor(user);
    if (landingRoute !== '/trading') return <Redirect href={landingRoute} />;
  }

  return children;
}
