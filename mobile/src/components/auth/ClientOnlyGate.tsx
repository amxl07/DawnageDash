import { Monitor } from 'lucide-react-native';
import { View } from 'react-native';

import { Button, Card, Screen, Text } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { iconSize, spacing, useTheme } from '@/theme';

/** Coaches and admins use the web dashboard; this app is client-only. */
export function ClientOnlyGate() {
  const { colors } = useTheme();
  const { signOut, role } = useAuth();
  return (
    <Screen>
      <View style={{ paddingTop: spacing['2xl'], alignItems: 'center', gap: spacing.md }}>
        <Monitor size={iconSize.xl} color={colors.primary} strokeWidth={2} accessible={false} />
        <Text variant="h1" style={{ textAlign: 'center' }}>
          This app is for clients
        </Text>
        <Card style={{ gap: spacing.sm }}>
          <Text variant="bodySm" tone="muted" style={{ textAlign: 'center' }}>
            You&apos;re signed in as a {role ?? 'team member'}. Coach and admin tools live in the
            web dashboard.
          </Text>
        </Card>
        <Button label="Sign out" onPress={() => void signOut()} style={{ alignSelf: 'stretch' }} />
      </View>
    </Screen>
  );
}
