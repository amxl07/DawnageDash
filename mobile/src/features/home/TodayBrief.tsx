import { RefreshCw } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppSymbol } from '@/components/ui/AppSymbol';
import { InlineAction } from '@/components/ui/InlineAction';
import { Section } from '@/components/ui/Section';
import { Button, Card, SkeletonCard, Text } from '@/components/ui';
import { MotionReveal } from '@/components/ui/MotionReveal';
import type { CoachLookup } from '@/hooks/useCoach';
import type { PlanDay } from '@/hooks/usePlans';
import type { TodayAction } from '@/lib/today-action';
import { parseLocalDate } from '@/lib/dates';
import { iconSize, radius, spacing, useTheme } from '@/theme';

type Props = {
  date: string;
  firstName: string;
  coach?: CoachLookup;
  action: TodayAction | null;
  actionError?: boolean;
  onAction: () => void;
  onRetry: () => void;
  onProfile: () => void;
  children: React.ReactNode;
  welcome?: React.ReactNode;
  programDay?: number;
  session?: PlanDay;
  attention?: boolean;
  deliveryPending?: boolean;
};

const actionLabels: Record<string, string> = {
  'check-in': 'Check in', 'resume-checkin': 'Continue check-in',
  'resume-workout': 'Resume workout', 'review-update': 'Review update',
  'open-plan': 'Start session', 'review-progress': 'View your record',
};

export function TodayBrief({ date, firstName, coach, action, actionError, onAction, onRetry, onProfile, children, welcome, programDay, session, attention = false }: Props) {
  const { colors } = useTheme();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(parseLocalDate(date));
  const recorded = action?.kind === 'review-progress' && !attention;
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text variant="bodySm" tone="muted">{dateLabel}</Text>
          <Text variant="h1" accessibilityRole="header" style={styles.greeting}>{welcome ? `Welcome, ${firstName}.` : `${greeting}, ${firstName}.`}</Text>
          <View style={styles.metadata}>
            {programDay ? <Text variant="bodySm" tone="muted" accessibilityLabel={`Day ${programDay} of your program`}>Day {programDay}</Text> : null}
            {coach?.kind === 'assigned' ? (
              <Text variant="bodySm" tone="muted" style={styles.coach} accessibilityLabel={'Your coach: ' + (coach.coach.full_name || 'Dawnage coach')}>
                Coached by {coach.coach.full_name || 'Dawnage'}
              </Text>
            ) : <Text variant="bodySm" tone="muted" style={styles.coach}>{coach?.kind === 'unassigned' ? 'Waiting for your coach to connect' : coach?.kind === 'unavailable' ? 'Coach details are unavailable' : 'Loading coach details…'}</Text>}
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Open your profile" onPress={onProfile}
          style={({ pressed }) => [styles.profile, { backgroundColor: pressed ? colors.elevated : colors.card, borderColor: colors.border }]}>
          <AppSymbol name="profile" size={iconSize.md} color={colors.foreground} />
        </Pressable>
      </View>

      {welcome || (action ? (
        <MotionReveal revision={action.kind + ':' + (session?.day_number ?? '')}>
        <Card style={[styles.action, { backgroundColor: colors.card }]} testID="home-next-action">
          {attention ? <Text variant="overline" tone="destructive">Needs your attention</Text> : null}
          <View style={{ gap: spacing.sm }}>
            <Text variant="h2" accessibilityRole="header" style={styles.actionTitle}>{session?.focus || action.title}</Text>
            {session ? <Text variant="label" tone="muted">Day {session.day_number} · {session.exercises.length} exercises</Text> : null}
            {action.detail ? <Text variant="bodySm" tone="muted" style={styles.actionDetail}>{action.detail}</Text> : null}
          </View>
          <Button variant={recorded ? 'secondary' : 'primary'} label={action.kind === 'open-plan' && typeof action.route === 'string' ? 'View your plan' : actionLabels[action.kind] || action.title} onPress={onAction} testID="home-today-action" />
        </Card>
        </MotionReveal>
      ) : actionError ? (
        <HomeProblem title="Couldn't load today's summary" message="We couldn't load the information for your next step." onRetry={onRetry} />
      ) : <SkeletonCard lines={4} />)}
      {children}
    </View>
  );
}

export function HomeSectionHeading({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return <Section title={title} action={action && onPress ? <InlineAction label={action} tone="neutral" onPress={onPress} /> : undefined} />;
}

export function HomeProblem({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.problem, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text variant="body" style={{ fontWeight: '600' }}>{title}</Text>
        <Text variant="bodySm" tone="muted">{message}</Text>
      </View>
      <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel={'Retry: ' + title} style={styles.retry}>
        <RefreshCw size={20} color={colors.primary} accessible={false} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: spacing.content, paddingBottom: spacing.base },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.base },
  headerCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  greeting: { letterSpacing: -0.6 },
  profile: { minWidth: 48, minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: spacing.md, rowGap: spacing.xs },
  coach: { flexShrink: 1 },
  action: { padding: spacing.content, gap: spacing.md, borderRadius: radius.card },
  actionTitle: { letterSpacing: -0.5 },
  actionDetail: { maxWidth: 420 },
  problem: { padding: spacing.base, borderRadius: radius.card, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  retry: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
