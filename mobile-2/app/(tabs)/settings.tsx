import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { StatusBanner } from '@/components/ui/status-banner';
import { Surface } from '@/components/ui/surface';
import { TabScreenBoundary } from '@/components/ui/tab-screen-boundary';
import { useSession } from '@/session/session-context';
import { useTheme } from '@/theme/theme';

export default function SettingsScreen() {
  const { session, signOut } = useSession();
  const { spacing } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  if (!session) return <TabScreenBoundary />;
  const connection = session.mode === 'demo' ? 'Local demo data' : new URL(session.serverUrl).host;

  const handleSignOut = async () => {
    setError(null);
    setIsSigningOut(true);
    try {
      await signOut();
      router.replace('/welcome');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not sign out.');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <TabScreenBoundary>
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ gap: spacing.md, padding: spacing.md, paddingBottom: spacing.xxl }}>
      <View style={{ gap: 4 }}><AppText variant="title">You</AppText><AppText tone="muted">Your current connection and account.</AppText></View>
      {error ? <StatusBanner tone="danger">{error}</StatusBanner> : null}
      <Surface elevated style={{ gap: 14 }}>
        <View style={{ gap: 4 }}><AppText tone="muted" variant="caption">SIGNED IN AS</AppText><AppText variant="title">{session.email}</AppText></View>
        <View style={{ gap: 4 }}><AppText tone="muted" variant="caption">CONNECTION</AppText><AppText>{session.mode === 'demo' ? 'Demo mode' : 'Connected server'}</AppText><AppText tone="muted" variant="caption">{connection}</AppText></View>
      </Surface>
      <Surface style={{ gap: 8 }}><AppText style={{ fontWeight: '700' }}>Your privacy</AppText><AppText tone="muted">Your sign-in token stays in secure device storage and is never shown here.</AppText></Surface>
      <AppButton loading={isSigningOut} onPress={() => void handleSignOut()} tone="danger">Sign out</AppButton>
    </ScrollView>
    </TabScreenBoundary>
  );
}
