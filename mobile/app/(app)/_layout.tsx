import { Redirect, Stack, usePathname } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { ClientOnlyGate } from '@/components/auth/ClientOnlyGate';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationRouting } from '@/hooks/useNotificationRouting';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useTheme } from '@/theme';

function Booting() {
  const { colors } = useTheme();
  // The one place a bare spinner is allowed: auth boot, before any UI exists.
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export default function AppLayout() {
  const { session, loading, role, passwordRecoveryPending } = useAuth();
  const { colors } = useTheme();
  const pathname = usePathname();

  // Hooks must run unconditionally; the query itself is gated on user id.
  const { step, isLoading: onboardingLoading } = useOnboarding();
  // Only route notifications once the user is actually in the app.
  useNotificationRouting(Boolean(session) && step >= 3);

  if (loading) return <Booting />;
  if (passwordRecoveryPending) return <Redirect href="/(auth)/reset-password" />;
  if (!session) return <Redirect href="/(auth)/login" />;

  // Coaches/admins belong on the web dashboard.
  if (role === 'coach' || role === 'admin') return <ClientOnlyGate />;

  if (onboardingLoading) return <Booting />;

  const onOnboarding = pathname === '/onboarding';
  if (step < 3 && !onOnboarding) return <Redirect href="/(app)/onboarding" />;
  if (step >= 3 && onOnboarding) return <Redirect href="/(app)/(tabs)" />;

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      {/* The exercise carousel owns horizontal pans, so the interactive
          back-swipe must be off or swiping between exercises pops the screen.
          The header X is the way out. */}
      <Stack.Screen name="logger" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
