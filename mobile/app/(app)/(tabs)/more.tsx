import { useRouter } from 'expo-router';
import {
  Camera,
  LogOut,
  MessageSquareText,
  Ruler,
  Settings,
  User,
  type LucideIcon,
} from 'lucide-react-native';
import { Alert, Pressable, View } from 'react-native';

import { Card, ListRow, Screen, Text } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { HIT_SLOP_MIN, iconSize, spacing, useTheme } from '@/theme';

type Row = { icon: LucideIcon; label: string; href: string; hint: string };

const PROGRESS_ROWS: Row[] = [
  { icon: Ruler, label: 'Measurements', href: '/(app)/measurements', hint: 'Track body measurements' },
  { icon: Camera, label: 'Progress photos', href: '/(app)/media', hint: 'Compare your weekly photos' },
  { icon: MessageSquareText, label: 'Weekly Feedback', href: '/(app)/weekly-feedback', hint: 'Your weekly check-in' },
];

const ACCOUNT_ROWS: Row[] = [
  { icon: User, label: 'Profile', href: '/(app)/profile', hint: 'Personal details' },
  { icon: Settings, label: 'Settings', href: '/(app)/settings', hint: 'Reminders and theme' },
];

export default function MoreScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { signOut } = useAuth();

  const confirmSignOut = () => {
    Alert.alert('Sign out?', "You'll need to sign in again.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <Screen>
      <Text variant="h1" style={{ marginBottom: spacing.base }}>
        More
      </Text>

      <View style={{ gap: spacing.sm }}>
        <Text variant="label" tone="muted">Progress</Text>
        <Card padded={false}>
          {PROGRESS_ROWS.map((row, index) => (
            <ListRow
              key={row.href}
              icon={row.icon}
              title={row.label}
              subtitle={row.hint}
              divider={index > 0}
              onPress={() => router.push(row.href as never)}
            />
          ))}
        </Card>
      </View>

      <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
        <Text variant="label" tone="muted">Account</Text>
        <Card padded={false}>
          {ACCOUNT_ROWS.map((row, index) => (
            <ListRow
              key={row.href}
              icon={row.icon}
              title={row.label}
              subtitle={row.hint}
              divider={index > 0}
              onPress={() => router.push(row.href as never)}
            />
          ))}
        </Card>
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <Pressable
          onPress={confirmSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            minHeight: HIT_SLOP_MIN,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <LogOut size={iconSize.md} color={colors.primary} strokeWidth={2} accessible={false} />
          <Text tone="primary">Sign out</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
