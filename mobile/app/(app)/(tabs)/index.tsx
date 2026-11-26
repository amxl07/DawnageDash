import { useRouter } from 'expo-router';
import { ArrowUpRight, ClipboardList } from 'lucide-react-native';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { Button, Card, Screen, SkeletonCard, Text } from '@/components/ui';
import { HomeProblem, HomeSectionHeading, TodayBrief } from '@/features/home/TodayBrief';
import { HomeDetails } from '@/features/home/HomeDetails';
import { NextSessionCard } from '@/features/home/NextSessionCard';
import { WeeklyRecap } from '@/features/home/weekly-recap-card';
import { weekConsistencyLabel } from '@/features/home/weekly-recap';
import { RecentRecord } from '@/features/home/RecentRecord';
import { WeeklyReflection } from '@/features/home/WeeklyReflection';
import { WeekRecordStrip } from '@/features/home/WeekRecordStrip';
import { buildWeekRecords, recentRecordSummary } from '@/features/home/selectors';
import { actionReadiness, isBlocked, pendingRecordRoute, prioritizedPending, queuedPlanDays } from '@/features/home/home-state';
import { useHomeData } from '@/features/home/useHomeData';
import { useHomeDate } from '@/features/home/useHomeDate';
import { useHomeLocal } from '@/features/home/useHomeLocal';
import { usePlanProvenance } from '@/hooks/usePlanProvenance';
import { calendarDaysEnding, localDateString, parseLocalDate } from '@/lib/dates';
import { resolveTodayAction } from '@/lib/today-action';
import { resolveProgramStatus } from '@/features/program/program-status';
import { ProgramWelcome } from '@/features/program/ProgramWelcome';
import { spacing, useTheme } from '@/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const today = useHomeDate();
  const data = useHomeData(today);
  const local = useHomeLocal(today);
  const profile = data.profile.state === 'ready' ? data.profile.data : null;
  const rows = data.checkIns.state === 'ready' ? data.checkIns.data : [];
  const plan = data.plan.state === 'ready' ? data.plan.data : null;
  const provenance = usePlanProvenance(plan?.days);
  const assigned = plan?.source === 'user' ? plan.days : [];
  const pending = prioritizedPending([
    ...(local.data?.checkIns.map((item) => ({ kind: 'check-in' as const, id: item.id, date: item.payload.date, queuedAt: item.queuedAt, failure: item.failure })) ?? []),
    ...(local.data?.workouts.map((item) => ({ kind: 'workout' as const, id: item.id, date: item.date, logId: item.existingLogId, queuedAt: item.queuedAt, failure: item.failure })) ?? []),
  ]);
  const needsAttention = pending.find(isBlocked);
  const pendingDays = queuedPlanDays(local.data?.workouts ?? [], today);
  const logged = [...(data.loggedPlanDays.state === 'ready' ? data.loggedPlanDays.data : []), ...pendingDays];
  const trainingCurrent = data.plan.state === 'ready' && !data.plan.stale && data.loggedPlanDays.state === 'ready' && !data.loggedPlanDays.stale && Boolean(local.data) && !local.isError;
  const nextSession = trainingCurrent ? assigned.find((day) => !logged.includes(day.day_number)) : undefined;
  const queuedToday = local.data?.checkIns.find((item) => item.payload.date === today);
  const ready = actionReadiness({ checkIns: data.checkIns, hasToday: rows.some((row) => row.date === today), hasLocalToday: Boolean(queuedToday),
    hasRecovery: Boolean(local.data?.workoutDraft || local.data?.checkInDraft || needsAttention), localReady: Boolean(local.data) && !local.isError });
  const action = ready ? resolveTodayAction({
    today,
    checkedInToday: rows.some((row) => row.date === today), queuedCheckInToday: Boolean(queuedToday),
    blockedRecord: needsAttention ? { date: needsAttention.date, route: pendingRecordRoute(needsAttention) } : null,
    workoutDraft: local.data?.workoutDraft, checkInDraft: local.data?.checkInDraft,
    hasWorkoutPlan: Boolean(assigned.length), planChanged: data.plan.state === 'ready' && !data.plan.stale && provenance.hasChanged,
    nextPlanDay: trainingCurrent ? nextSession?.day_number ?? null : undefined,
  }) : null;
  const program = resolveProgramStatus({
    today, startDate: profile?.package_start_date,
    checkInDates: rows.map((row) => row.date), pendingDates: local.data?.checkIns.map((item) => item.payload.date) ?? [],
    ready: data.profile.state === 'ready' && profile !== null && !data.profile.stale && !data.profile.refreshing && data.checkIns.state === 'ready' && !data.checkIns.stale && !data.checkIns.refreshing && Boolean(local.data) && !local.isError,
  });
  const sessionInHero = action?.kind === 'open-plan' && typeof action.route === 'object' && action.route.pathname === '/(app)/logger' ? nextSession : undefined;
  const showWelcome = program.kind === 'not-started' && action?.kind === 'check-in';
  const showDailySummary = program.kind === 'active' || program.kind === 'unknown';
  const sunday = parseLocalDate(today);
  sunday.setDate(sunday.getDate() + (7 - sunday.getDay()) % 7);
  const week = buildWeekRecords(calendarDaysEnding(localDateString(sunday), 7), [
    ...rows.map((row) => ({ date: row.date, state: 'synced' as const })),
    ...(local.data?.checkInDraft ? [{ date: local.data.checkInDraft.date, state: 'draft' as const }] : []),
    ...(local.data?.checkIns.map((item) => ({ date: item.payload.date, state: isBlocked(item) ? 'blocked' as const : 'queued' as const })) ?? []),
  ]);
  const openCheckIn = (date: string) => router.push({ pathname: '/(app)/daily-check-in', params: { date } });
  const openTraining = () => router.push({ pathname: '/(app)/(tabs)/plans', params: { view: 'plan' } });
  const refresh = () => { data.refresh(); void local.refetch(); };
  const weeklyIsOptional = !local.data?.weeklyDraft && !local.data?.weeklyDraftError && data.weeklyFeedback.state === 'ready' && !data.weeklyFeedback.stale;
  const weeklyReflection = showDailySummary || local.data?.weeklyDraft || local.data?.weeklyDraftError ? (
    <WeeklyReflection today={today} history={data.weeklyFeedback}
      draft={local.data?.weeklyDraft} localReady={Boolean(local.data) && !local.isError}
      draftError={Boolean(local.data?.weeklyDraftError)} onRetryLocal={() => { void local.refetch(); }}
      onOpen={() => router.push('/(app)/weekly-feedback')} />
  ) : null;

  return (
    <Screen archetype="root" testID="home-screen" refreshControl={<RefreshControl refreshing={data.refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
      <TodayBrief date={today} firstName={profile?.full_name?.trim().split(/\s+/)[0] || 'there'}
        coach={data.coach.state === 'ready' ? data.coach.data : data.coach.state === 'error' ? { kind: 'unavailable' } : undefined} action={action}
        session={sessionInHero} attention={Boolean(needsAttention)} deliveryPending={Boolean(queuedToday)}
        programDay={program.kind === 'active' ? program.day : undefined}
        welcome={showWelcome ? <ProgramWelcome waiting={profile?.profile_data?.start_preference === 'wait_for_coach'} coach={data.coach.state === 'ready' ? data.coach.data : undefined} onStart={() => openCheckIn(today)} /> : undefined}
        actionError={data.checkIns.state === 'error' || (data.checkIns.state === 'ready' && data.checkIns.stale) || local.isError}
        onAction={() => { if (action?.route === '/(app)/(tabs)/plans') openTraining(); else if (action) router.push(action.route); }} onRetry={refresh} onProfile={() => router.push('/(app)/profile')}>
        {pending.length ? (
          <View style={[styles.pending, { borderColor: colors.border }]}>
            <Text variant="body" style={{ fontWeight: '600' }}>{needsAttention ? 'A saved record needs attention' : program.kind === 'pending' ? 'Your first check-in is waiting to sync' : 'Saved here. Syncing next.'}</Text>
            <Text variant="bodySm" tone="muted">{pending.length} {pending.length === 1 ? 'record is' : 'records are'} on this device. Open a record to check its delivery status.</Text>
            {(['check-in', 'workout'] as const).map((kind) => {
              const record = pending.find((item) => item.kind === kind);
              return record ? <Button key={kind} variant="ghost" label={'Review ' + kind} onPress={() => router.push(pendingRecordRoute(record))} /> : null;
            })}
          </View>
        ) : null}
        {data.profile.state === 'error' ? <HomeProblem title="Your profile couldn't load" message="Your other records are still available." onRetry={data.profile.retry} /> : data.profile.state === 'ready' && data.profile.stale ? <HomeProblem title="Showing your saved profile" message="Refresh to check for changes." onRetry={data.profile.retry} /> : null}
        {local.isError && action ? <HomeProblem title="Some device records couldn't load" message="Your saved work has been kept. Retry before starting another record." onRetry={() => { void local.refetch(); }} /> : null}

        {showDailySummary ? <>
          <View style={styles.section}>
            <HomeSectionHeading title="This week" action="History" onPress={() => router.push({ pathname: '/(app)/(tabs)/check-in', params: { history: '1' } })} />
            {data.checkIns.state === 'loading' ? <SkeletonCard lines={2} /> : data.checkIns.state === 'error' ?
              <HomeProblem title="Your records couldn't load" message="Try again to see this week's check-ins." onRetry={data.checkIns.retry} /> : <>
                <WeekRecordStrip days={week} today={today} onSelect={openCheckIn}
                  summary={weekConsistencyLabel(data.checkIns, week, today, Boolean(local.data) && !local.isError && !local.isFetching)} />
                {data.checkIns.stale ? <Text variant="bodySm" tone="muted">Showing saved information. Pull down to refresh.</Text> : null}
              </>}
          </View>
          <WeeklyRecap history={data.checkIns} workouts={data.workouts} today={today} onOpen={() => router.push('/(app)/measurements')} />
        </> : null}

        {!sessionInHero ? <View testID="home-training-section" style={styles.section}>
          <HomeSectionHeading title="Your training" action="Your plan" onPress={openTraining} />
          {data.plan.state === 'loading' ? <SkeletonCard lines={3} /> : data.plan.state === 'error' ?
            <HomeProblem title="Your plan couldn't load" message="Your daily record is still available." onRetry={data.plan.retry} /> :
            nextSession ? <NextSessionCard day={nextSession} onPress={() => router.push({ pathname: '/(app)/logger', params: { day: String(nextSession.day_number) } })} /> :
            assigned.length && trainingCurrent ? <NextSessionCard day={assigned[0]} allLogged pending={pendingDays.length > 0} onPress={openTraining} /> :
            assigned.length ? <Card style={styles.quietCard}>
              <Text variant="h2">Your plan is ready</Text>
              <Text variant="bodySm" tone="muted">Open your training plan to choose a session.</Text>
              <Button variant="secondary" label="View training plan" onPress={openTraining} />
            </Card> : <Card style={styles.quietCard}>
              <Text variant="h2">{plan?.source === 'template' ? 'Explore your training' : 'Your plan comes next'}</Text>
              <Text variant="bodySm" tone="muted">{plan?.source === 'template' ? 'A training template is available. Your coach can assign a plan tailored to you.' : 'Your training plan will appear here when it is assigned.'}</Text>
              {plan?.source === 'template' ? <Button variant="secondary" label="Explore template" onPress={openTraining} /> : null}
            </Card>}
          {data.plan.state === 'ready' && data.plan.stale ? <HomeProblem title="Showing your saved plan" message="Refresh before choosing your next session." onRetry={data.plan.retry} /> : null}
          {assigned.length && data.loggedPlanDays.state === 'error' ? <HomeProblem title="Training history couldn't load" message="Your plan is available. Retry to find your next unlogged session." onRetry={data.loggedPlanDays.retry} /> : null}
          {assigned.length && data.loggedPlanDays.state === 'ready' && data.loggedPlanDays.stale ? <HomeProblem title="Showing saved training history" message="Refresh to check which sessions are logged." onRetry={data.loggedPlanDays.retry} /> : null}
          {pendingDays.length && nextSession ? <Text variant="bodySm" tone="muted">A session is saved on this device and waiting for delivery.</Text> : null}
        </View> : <Button variant="ghost" label="View training plan" onPress={openTraining} />}

        {!weeklyIsOptional ? weeklyReflection : null}

        <HomeDetails>
          {weeklyIsOptional ? weeklyReflection : null}
          {data.checkIns.state === 'ready' && rows.length ? <View style={styles.section}>
            <HomeSectionHeading title="Your recent record" action="Progress" onPress={() => router.push('/(app)/measurements')} />
            <RecentRecord summary={recentRecordSummary(rows, today)} />
          </View> : !showDailySummary ? <Button variant="secondary" label="View progress" onPress={() => router.push('/(app)/measurements')} /> : null}

          {data.assessment.state === 'ready' && data.assessment.data.completed < data.assessment.data.total ?
            <Pressable onPress={() => router.push({ pathname: '/(app)/profile', params: { assessment: '1' } })} accessibilityRole="button" accessibilityLabel="Continue your coaching assessment" style={[styles.assessment, { borderColor: colors.border }]}>
              <ClipboardList size={21} color={colors.mutedForeground} accessible={false} />
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text variant="body" style={{ fontWeight: '600' }}>A fuller picture of you</Text>
                <Text variant="bodySm" tone="muted">Coaching assessment · {data.assessment.data.completed} of {data.assessment.data.total} sections</Text>
              </View>
              <ArrowUpRight size={20} color={colors.mutedForeground} accessible={false} />
            </Pressable> : null}
        </HomeDetails>
        {data.assessment.state === 'error' ? <HomeProblem title="Assessment progress couldn't load" message="Your answers are kept separately from your daily record." onRetry={data.assessment.retry} /> : data.assessment.state === 'ready' && data.assessment.stale ? <HomeProblem title="Showing saved assessment progress" message="Refresh to check your latest saved sections." onRetry={data.assessment.retry} /> : null}
      </TodayBrief>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  quietCard: { gap: spacing.md, padding: spacing.content, borderRadius: 24 },
  pending: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 20, gap: spacing.sm },
  assessment: { borderTopWidth: 1, paddingVertical: 24, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
