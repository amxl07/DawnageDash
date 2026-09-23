import { ArrowUpRight, Check, ChevronRight, Clock3, RefreshCw, UserRound } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

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

export function TodayBrief({ date, firstName, coach, action, actionError, onAction, onRetry, onProfile, children, welcome, programDay, session, attention = false, deliveryPending = false }: Props) {
  const { colors } = useTheme();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(parseLocalDate(date));
  const recorded = action?.kind === 'review-progress' && !attention;
  const continuing = action?.kind === 'resume-checkin' || action?.kind === 'resume-workout';
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text variant="bodySm" tone="muted">{dateLabel}</Text>
          <Text variant="h1" accessibilityRole="header" style={styles.greeting}>{welcome ? `Welcome, ${firstName}.` : `${greeting}, ${firstName}.`}</Text>
          {programDay ? <Text variant="bodySm" tone="primary">Day {programDay} of your program</Text> : null}
          {coach?.kind === 'assigned' ? (
            <View style={styles.coach}>
              <View style={[styles.coachMark, { backgroundColor: colors.primary }]} accessible={false} />
              <Text variant="bodySm" tone="muted" style={{ flexShrink: 1 }} accessibilityLabel={'Your coach: ' + (coach.coach.full_name || 'Dawnage coach')}>
                Coached by <Text variant="bodySm">{coach.coach.full_name || 'Dawnage'}</Text>
              </Text>
            </View>
          ) : <Text variant="bodySm" tone="muted">{coach?.kind === 'unassigned' ? 'Waiting for your coach to connect' : coach?.kind === 'unavailable' ? 'Coach details are unavailable' : 'Loading coach details…'}</Text>}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Open your profile" onPress={onProfile}
          style={({ pressed }) => [styles.profile, { backgroundColor: pressed ? colors.elevated : colors.card, borderColor: colors.border }]}>
          <UserRound size={iconSize.md} color={colors.foreground} strokeWidth={1.7} accessible={false} />
        </Pressable>
      </View>

      {welcome || (action ? (
        <MotionReveal revision={action.kind + ':' + (session?.day_number ?? '')}>
        <Card style={[styles.action, { borderColor: recorded ? colors.border : colors.primarySoft, backgroundColor: recorded ? colors.card : colors.primarySoft }]} testID="home-next-action">
          <View style={styles.actionTop}>
            <Text variant="overline" tone="primary">{attention ? 'Needs your attention' : continuing ? 'Ready to continue' : recorded ? 'Your daily record' : 'Your next step'}</Text>
            <View style={[styles.actionIcon, { backgroundColor: recorded ? colors.elevated : colors.primaryFill }]} accessible={false}>
              {recorded ? deliveryPending ? <Clock3 size={23} color={colors.primary} strokeWidth={1.8} /> : <Check size={23} color={colors.primary} strokeWidth={1.8} /> : <ArrowUpRight size={23} color={colors.onPrimary} strokeWidth={1.8} />}
            </View>
          </View>
          <View style={{ gap: spacing.sm }}>
            <Text variant="h1" accessibilityRole="header" style={styles.actionTitle}>{session?.focus || action.title}</Text>
            {session ? <Text variant="label" tone="primary">Day {session.day_number} · {session.exercises.length} exercises</Text> : null}
            <Text variant="bodySm" tone="muted" style={styles.actionDetail}>{action.detail}</Text>
          </View>
          <Button variant={recorded ? 'secondary' : 'primary'} label={action.kind === 'open-plan' && typeof action.route === 'string' ? 'View your plan' : actionLabels[action.kind] || action.title} onPress={onAction} testID="home-today-action" />
        </Card>
        </MotionReveal>
      ) : actionError ? (
        <HomeProblem title="Your day is still here" message="We couldn't load the information for your next step." onRetry={onRetry} />
      ) : <SkeletonCard lines={4} />)}
      {children}
    </View>
  );
}

export function HomeSectionHeading({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeading}>
      <Text variant="h2" accessibilityRole="header" style={{ flex: 1 }}>{title}</Text>
      {action && onPress ? (
        <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={onPress} style={styles.sectionLink}>
          <Text variant="bodySm" tone="muted" style={{ flexShrink: 1 }}>{action}</Text>
          <ChevronRight size={15} color={colors.mutedForeground} accessible={false} />
        </Pressable>
      ) : null}
    </View>
  );
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
  page: { gap: 28, paddingBottom: spacing.base },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.base },
  headerCopy: { flex: 1, minWidth: 0, gap: spacing.sm },
  greeting: { letterSpacing: -0.6, marginTop: spacing.xs },
  profile: { minWidth: 48, minHeight: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  coach: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  coachMark: { width: 5, height: 5, borderRadius: 3 },
  action: { padding: 24, gap: 20, borderRadius: 24 },
  actionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.base },
  actionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { letterSpacing: -0.5 },
  actionDetail: { maxWidth: 420 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionLink: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1, maxWidth: '48%' },
  problem: { padding: spacing.base, borderRadius: radius.card, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  retry: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
