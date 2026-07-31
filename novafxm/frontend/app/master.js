import React, { useEffect } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import RequireAuth from '../src/components/auth/RequireAuth';
import AdminScreen from './admin';

/** Each platform owns its data while the Master session can switch platforms. */
function MasterConsole() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.role && user.role !== 'master') router.replace('/login');
  }, [router, user?.role]);

  if (!user || user.role !== 'master') return <Redirect href="/login" />;
  return <AdminScreen />;
}

export default function MasterScreen() {
  return <RequireAuth><MasterConsole /></RequireAuth>;
}
