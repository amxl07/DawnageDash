import { Redirect, Stack, usePathname } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useState } from 'react';

import { ClientOnlyGate } from '@/components/auth/ClientOnlyGate';
import { RestTimerProvider } from '@/components/logger/useRestTimer';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationRouting } from '@/hooks/useNotificationRouting';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useTheme } from '@/theme';
import { Button, Screen, Text } from '@/components/ui';
import { resolveAppGate } from '@/features/onboarding/routing';

function AccessRecovery({ role, retry, signOut }: { role: boolean; retry: () => Promise<unknown>; signOut: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return <Screen><View style={{ gap: 20, paddingTop: 64 }}>
    <Text variant="h1">{role ? 'Let’s reconnect your account' : 'Your setup is safe'}</Text>
    <Text tone="muted">{role ? 'We couldn’t confirm your account access. Try again to continue.' : 'We couldn’t load your saved setup. Try again when your connection is ready.'}</Text>
    {failed ? <Text tone="destructive" accessibilityLiveRegion="polite">Still unavailable. Try again or sign in again.</Text> : null}
    <Button label="Try again" loading={busy} onPress={() => {
      if (busy) return;
      setBusy(true); setFailed(false);
      void retry().catch(() => setFailed(true)).finally(() => setBusy(false));
    }} />
    <Button label="Sign out" variant="ghost" onPress={() => { void signOut(); }} />
  </View></Screen>;
}

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
  const { session, loading, role, passwordRecoveryPending, retryRole, signOut } = useAuth();
  const { colors } = useTheme();
  const pathname = usePathname();

  // Hooks must run unconditionally; the query itself is gated on user id.
  const { step, isLoading: onboardingLoading, isError: onboardingError, refetch } = useOnboarding();
  const gate = resolveAppGate({ loading, recovery: passwordRecoveryPending, session: Boolean(session), role, setupLoading: onboardingLoading, setupError: onboardingError, step });
  // Only route notifications once the user is actually in the app.
  useNotificationRouting(gate === 'home');

  if (gate === 'loading') return <Booting />;
  if (gate === 'password-recovery') return <Redirect href="/(auth)/reset-password" />;
  if (gate === 'sign-in' || !session) return <Redirect href="/(auth)/login" />;

  // Coaches/admins belong on the web dashboard.
  if (gate === 'client-only') return <ClientOnlyGate />;
  if (gate === 'role-recovery') return <AccessRecovery role retry={retryRole} signOut={signOut} />;
  if (gate === 'setup-recovery') return <AccessRecovery role={false} retry={() => refetch({ throwOnError: true })} signOut={signOut} />;

  const onOnboarding = pathname === '/onboarding';
  if (step < 3 && !onOnboarding) return <Redirect href="/(app)/onboarding" />;
  if (step >= 3 && onOnboarding) return <Redirect href="/(app)/(tabs)" />;

  return (
    <RestTimerProvider key={session.user.id} userId={session.user.id}>
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
    </RestTimerProvider>
  );
}
