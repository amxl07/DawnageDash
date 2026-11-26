import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import {
  Camera,
  FileText,
  LogOut,
  MessageSquareText,
  Ruler,
  Settings,
  Trash2,
  User,
  type LucideIcon,
} from 'lucide-react-native';
import { Alert, Pressable, View } from 'react-native';

import { CoachStatusCard } from '@/components/coach/CoachStatusCard';
import { Card, ListRow, Screen, SkeletonCard, Text } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { deleteAccount } from '@/features/account/deleteAccount';
import { useCoach } from '@/hooks/useCoach';
import { privacyPolicyUrl } from '@/lib/env';
import { HIT_SLOP_MIN, iconSize, spacing, useTheme } from '@/theme';

type Row = { icon: LucideIcon; label: string; href: string; hint?: string };

const COACHING_ROWS: Row[] = [
  {
    icon: MessageSquareText,
    label: 'Weekly check-in',
    href: '/(app)/weekly-feedback',
  },
];

const PROGRESS_ROWS: Row[] = [
  {
    icon: Ruler,
    label: 'Measurements',
    href: '/(app)/measurements',
  },
  {
    icon: Camera,
    label: 'Progress photos',
    href: '/(app)/media',
  },
];

const ACCOUNT_ROWS: Row[] = [
  { icon: User, label: 'Profile', href: '/(app)/profile' },
  { icon: Settings, label: 'Settings', href: '/(app)/settings', hint: 'Reminders and theme' },
];

export default function MoreScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { signOut } = useAuth();
  const { data: coachLookup } = useCoach();

  const confirmSignOut = () => {
    Alert.alert('Sign out?', "You'll need to sign in again.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const [deleting, setDeleting] = useState(false);
  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your profile, check-ins, measurements, workouts and progress photos. Your coach will no longer see them. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            setDeleting(true);
            deleteAccount(signOut).catch((error: Error) => {
              setDeleting(false);
              Alert.alert('Account not deleted', error.message);
            });
          },
        },
      ],
    );
  };

  return (
    <Screen archetype="root">
      <Text variant="h1" style={{ marginBottom: spacing.base }}>
        You
      </Text>

      {coachLookup ? <CoachStatusCard lookup={coachLookup} /> : <SkeletonCard lines={2} />}

      <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
        <Text variant="label" tone="muted">Coaching</Text>
        <Card padded={false}>
          {COACHING_ROWS.map((row) => (
            <ListRow
              key={row.href}
              icon={row.icon}
              title={row.label}
              subtitle={row.hint}
              onPress={() => router.push(row.href as never)}
            />
          ))}
        </Card>
      </View>

      <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
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
          {privacyPolicyUrl ? (
            <ListRow
              icon={FileText}
              title="Privacy policy"
              divider
              onPress={() => void WebBrowser.openBrowserAsync(privacyPolicyUrl)}
            />
          ) : null}
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
            borderRadius: spacing.sm,
            backgroundColor: pressed ? colors.pressed : 'transparent',
          })}
        >
          <LogOut size={iconSize.md} color={colors.primary} strokeWidth={2} accessible={false} />
          <Text tone="primary">Sign out</Text>
        </Pressable>
        <Pressable
          onPress={confirmDeleteAccount}
          disabled={deleting}
          accessibilityRole="button"
          accessibilityLabel="Delete account"
          accessibilityState={{ disabled: deleting, busy: deleting }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            minHeight: HIT_SLOP_MIN,
            borderRadius: spacing.sm,
            opacity: deleting ? 0.5 : 1,
            backgroundColor: pressed ? colors.pressed : 'transparent',
          })}
        >
          <Trash2 size={iconSize.md} color={colors.destructive} strokeWidth={2} accessible={false} />
          <Text tone="destructive">{deleting ? 'Deleting account…' : 'Delete account'}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
