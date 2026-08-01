import React, { useEffect } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import RequireAuth from '../src/components/auth/RequireAuth';
import AdminScreen from './admin';
import { isMasterHost } from '../src/utils/appHost';

/** Each platform owns its own Master Console and its own data. */
function MasterConsole() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.role && user.role !== 'master') router.replace('/login');
  }, [router, user?.role]);

  if (!user || user.role !== 'master') return <Redirect href="/login" />;
  if (!isMasterHost()) return <Redirect href="/trading" />;
  return <AdminScreen />;
}

export default function MasterScreen() {
  return <RequireAuth><MasterConsole /></RequireAuth>;
}
