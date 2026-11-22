import { useRouter } from 'expo-router';
import { ClipboardList } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { CoachBadge } from '@/components/coach/CoachBadge';
import { ExercisePrescriptionSheet } from '@/components/plans/ExercisePrescriptionSheet';
import { PlanDayCard } from '@/components/plans/PlanDayCard';
import { DisclosureChevron } from '@/components/ui/DisclosureChevron';
import { MotionReveal } from '@/components/ui/MotionReveal';
import { Button, Card, EmptyState, ErrorState, Screen, SkeletonCard, Text } from '@/components/ui';
import { useUserProfile, useWorkoutPlan, type PlanDay, type PlanExercise } from '@/hooks/usePlans';
import { usePlanProgress, type PlanDayStatus } from '@/hooks/usePlanProgress';
import { relativeDays, usePlanProvenance } from '@/hooks/usePlanProvenance';
import { formatTypeLabel } from '@/lib/workout-constants';
import { iconSize, radius, spacing, useTheme } from '@/theme';

type ActivePlan = {
  level: string;
  workoutType: string;
  subCategory: string | null;
  daysPerWeek: number;
};

function parseActivePlan(value: string | null | undefined): ActivePlan | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<ActivePlan>;
    if (!parsed.level || !parsed.workoutType || !parsed.daysPerWeek) return null;
    return {
      level: parsed.level,
      workoutType: parsed.workoutType,
      subCategory: parsed.subCategory ?? null,
      daysPerWeek: parsed.daysPerWeek,
    };
  } catch {
    return null;
  }
}

function exerciseTarget(exercise: PlanExercise): string {
  const target = exercise.duration || exercise.reps || '—';
  return `${exercise.sets} × ${target}`;
}

function exercisePrescription(exercise: PlanExercise): string {
  return `${exercise.name} · ${exerciseTarget(exercise)}`;
}

function NextSessionCard({
  day,
  status,
  onStart,
  onShowDetails,
}: {
  day: PlanDay;
  status: Extract<PlanDayStatus, 'today' | 'active'>;
  onStart: () => void;
  onShowDetails: (exercise: PlanExercise) => void;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const actionLabel = status === 'active' ? `Continue Day ${day.day_number}` : `Start Day ${day.day_number}`;

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <Text variant="label" tone="primary">Next session</Text>
        <Text variant="h2">{day.focus || `Day ${day.day_number}`}</Text>
        <Text variant="bodySm" tone="muted">
          Day {day.day_number} · {day.exercises.length} {day.exercises.length === 1 ? 'exercise' : 'exercises'}
        </Text>
      </View>
      {day.exercises.slice(0, 3).map((exercise, index) => (
        <Text key={exercise.id ?? `${exercise.name}-${index}`} variant="bodySm" numeric>
          {exercisePrescription(exercise)}
        </Text>
      ))}
      {day.exercises.length > 3 ? (
        <Text variant="bodySm" tone="muted">+{day.exercises.length - 3} more</Text>
      ) : null}
      <Button label={actionLabel} onPress={onStart} style={{ minHeight: 48 }} />
      <Pressable
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityLabel={`${open ? 'Hide' : 'View'} full prescription for Day ${day.day_number}`}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => ({
          minHeight: 48,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.sm,
          borderRadius: radius.md,
          backgroundColor: pressed ? colors.pressed : 'transparent',
        })}
      >
        <Text variant="bodySm" tone="primary">{open ? 'Hide prescription' : 'View full prescription'}</Text>
        <DisclosureChevron expanded={open} size={iconSize.md} color={colors.mutedForeground} />
      </Pressable>
      <MotionReveal revision={open ? 'open' : 'closed'}>
        {open ? (
          <View style={{ gap: spacing.md }}>
            {day.notes ? <Text variant="bodySm" tone="muted">{day.notes}</Text> : null}
            {day.exercises.map((exercise, index) => (
              <View
                key={exercise.id ?? `${exercise.name}-${index}`}
                style={{
                  gap: spacing.xs,
                  paddingTop: spacing.md,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                <Text>{exercise.name}</Text>
                <Text variant="bodySm" tone="muted" numeric>{exerciseTarget(exercise)}</Text>
                {exercise.notes ? <Text variant="bodySm" tone="muted">{exercise.notes}</Text> : null}
                <Pressable
                  onPress={() => onShowDetails(exercise)}
                  accessibilityRole="button"
                  accessibilityLabel={`Show details for ${exercise.name}`}
                  style={({ pressed }) => ({
                    minWidth: 48,
                    minHeight: 48,
                    alignSelf: 'flex-start',
                    justifyContent: 'center',
                    paddingHorizontal: spacing.sm,
                    borderRadius: radius.sm,
                    backgroundColor: pressed ? colors.pressed : 'transparent',
                  })}
                >
                  <Text variant="bodySm" tone="primary">Details</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </MotionReveal>
    </Card>
  );
}

export function TrainingPlan({ header }: { header: ReactNode }) {
  const { colors } = useTheme();
  const router = useRouter();
  const [selectedExercise, setSelectedExercise] = useState<PlanExercise | null>(null);
  const {
    data: profile,
    isLoading: profileLoading,
    isFetching: profileFetching,
    fetchStatus: profileFetchStatus,
    isError,
    refetch,
  } = useUserProfile();
  const {
    data: plan,
    isLoading: planLoading,
    isFetching: planFetching,
    fetchStatus: planFetchStatus,
    isError: planIsError,
    refetch: refetchPlan,
  } = useWorkoutPlan();
  const { hasChanged, markSeen, ready: provenanceReady, updatedAt } = usePlanProvenance(plan?.days);
  const progress = usePlanProgress(plan?.days ?? []);
  const pointer = parseActivePlan(profile?.active_workout_plan);
  const hasRenderedTrainingPlan =
    !profileLoading &&
    !planLoading &&
    !progress.isLoading &&
    !isError &&
    !planIsError &&
    plan?.source === 'user' &&
    !progress.isError &&
    provenanceReady &&
    Boolean(pointer && plan.days.length);

  useEffect(() => {
    if (hasRenderedTrainingPlan && updatedAt) markSeen();
  }, [hasRenderedTrainingPlan, markSeen, updatedAt]);

  const days = plan?.days ?? [];
  const progressReady =
    !profileLoading &&
    !profileFetching &&
    profileFetchStatus !== 'paused' &&
    !isError &&
    !planLoading &&
    !planFetching &&
    planFetchStatus !== 'paused' &&
    !planIsError &&
    !progress.isLoading &&
    !progress.isFetching &&
    progress.fetchStatus !== 'paused' &&
    !progress.isError;
  const focusedDay = plan?.source === 'user' && progressReady
    ? days.find((day) => {
        const status = progress.statuses[day.day_number];
        return status === 'today' || status === 'active';
      })
    : undefined;
  const remainingDays = focusedDay ? days.filter((day) => day.id !== focusedDay.id) : days;
  const startDay = (day: PlanDay) => router.push({
    pathname: '/(app)/logger',
    params: { day: String(day.day_number) },
  });

  return (
    <>
      <Screen archetype="root">
        <View style={{ gap: spacing.lg }}>
          {header}

          <View testID="plan-section-content" style={{ gap: spacing.md }}>
            {isError ? (
              <ErrorState
                title={profile ? "Profile couldn’t refresh" : "Profile didn’t load"}
                message="Retry to check your plan assignment."
                onRetry={() => void refetch()}
                retryLabel="Retry profile"
              />
            ) : null}
            {planIsError ? (
              <ErrorState
                title={plan ? "Training plan couldn’t refresh" : "Training plan didn’t load"}
                message={plan ? "Your saved plan is shown below." : "Retry to load your training plan."}
                onRetry={() => void refetchPlan()}
                retryLabel="Retry training plan"
              />
            ) : null}
            {progress.isError ? (
              <ErrorState
                title="Training history couldn’t load"
                message="Retry to check which sessions are logged."
                onRetry={() => void progress.refetch()}
                retryLabel="Retry training history"
              />
            ) : null}

            {(profileLoading && !profile) || (planLoading && !plan) ? (
              <SkeletonCard lines={4} />
            ) : (!profile && isError) || (!plan && planIsError) ? null : !pointer ? (
              <Card>
                <EmptyState
                  icon={ClipboardList}
                  title="No workout plan yet"
                  message="No workout plan has been assigned yet. Please contact your coach."
                />
              </Card>
            ) : (
              <View style={{ gap: spacing.md }}>
                <Card style={{ gap: spacing.xs }}>
                  <Text variant="label" tone="muted">
                    {plan?.source === 'template' ? 'Training template' : 'Assigned plan'}
                  </Text>
                  <Text variant="h2">
                    {pointer.level} · {formatTypeLabel(pointer.workoutType)}
                    {pointer.subCategory ? ` · ${formatTypeLabel(pointer.subCategory)}` : ''} ·{' '}
                    {pointer.daysPerWeek}-day
                  </Text>
                  {plan?.source === 'user' ? <CoachBadge caption="Assigned by" /> : null}
                  {plan?.source === 'template' ? (
                    <Text variant="bodySm" tone="muted">
                      Preview these exercises. Your coach can assign a plan tailored to you before you start.
                    </Text>
                  ) : null}
                  {updatedAt && plan?.source === 'user' ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <Text variant="bodySm" tone={hasChanged ? 'primary' : 'muted'}>
                        {hasChanged ? 'Updated by your coach' : 'Last updated'} {relativeDays(updatedAt)}
                      </Text>
                      {hasChanged ? (
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />
                      ) : null}
                    </View>
                  ) : null}
                </Card>

                {focusedDay ? (
                  <View testID="plan-current-day">
                    <NextSessionCard
                      day={focusedDay}
                      status={progress.statuses[focusedDay.day_number] as Extract<PlanDayStatus, 'today' | 'active'>}
                      onStart={() => startDay(focusedDay)}
                      onShowDetails={setSelectedExercise}
                    />
                  </View>
                ) : null}

                {remainingDays.length ? remainingDays.map((day) => (
                  <PlanDayCard
                    key={day.id}
                    day={day}
                    status={
                      plan?.source !== 'user' || !progressReady
                        ? 'unknown'
                        : progress.statuses[day.day_number] ?? 'upcoming'
                    }
                    onStart={plan?.source === 'user' ? () => startDay(day) : undefined}
                    onShowDetails={setSelectedExercise}
                  />
                )) : focusedDay ? null : (
                  <Card>
                    <EmptyState
                      icon={ClipboardList}
                      title="Plan assigned, but no days found"
                      message="Your coach may still be setting this up. Please check with them."
                    />
                  </Card>
                )}

                {profile?.training_note || profile?.cardio_note || profile?.steps_note ? (
                  <Card style={{ gap: spacing.md }}>
                    <Text variant="h2">Coach notes</Text>
                    {profile.training_note ? <Text variant="bodySm">{profile.training_note}</Text> : null}
                    {profile.cardio_note ? (
                      <View style={{ gap: spacing.xs }}>
                        <Text variant="label" tone="muted">Cardio</Text>
                        <Text variant="bodySm">{profile.cardio_note}</Text>
                      </View>
                    ) : null}
                    {profile.steps_note ? (
                      <View style={{ gap: spacing.xs }}>
                        <Text variant="label" tone="muted">Steps</Text>
                        <Text variant="bodySm">{profile.steps_note}</Text>
                      </View>
                    ) : null}
                  </Card>
                ) : null}
              </View>
            )}
          </View>
        </View>
      </Screen>

      <ExercisePrescriptionSheet
        visible={selectedExercise !== null}
        exercise={selectedExercise}
        onClose={() => setSelectedExercise(null)}
      />
    </>
  );
}
