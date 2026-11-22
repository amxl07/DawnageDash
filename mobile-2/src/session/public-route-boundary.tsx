import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import type { PropsWithChildren } from 'react';

import { AppText } from '@/components/ui/app-text';
import {
  getPublicRouteAccessDecision,
  useSession,
} from '@/session/session-context';
import { useTheme } from '@/theme/theme';

export function PublicRouteBoundary({ children }: PropsWithChildren) {
  const { restoreStatus, session } = useSession();
  const { colors } = useTheme();
  const access = getPublicRouteAccessDecision({ restoreStatus, session });

  if (access === 'restoring') {
    return (
      <View
        accessibilityLabel="Restoring your session"
        accessibilityRole="progressbar"
        style={{
          alignItems: 'center',
          backgroundColor: colors.background,
          flex: 1,
          gap: 12,
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <ActivityIndicator color={colors.accent} />
        <AppText tone="muted">Restoring your session…</AppText>
      </View>
    );
  }

  if (access === 'redirect-tabs') {
    return <Redirect href="/(tabs)" />;
  }

  return children;
}
