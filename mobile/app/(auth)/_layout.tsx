import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';

export default function AuthLayout() {
  const { session, loading, passwordRecoveryPending } = useAuth();

  // A signed-in user belongs in the app — unless they are mid password reset.
  if (!loading && session && !passwordRecoveryPending) return <Redirect href="/(app)/(tabs)" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
