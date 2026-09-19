import { useRouter } from 'expo-router';
import { ClipboardList, Utensils } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { CoachBadge } from '@/components/coach/CoachBadge';
import { ExercisePrescriptionSheet } from '@/components/plans/ExercisePrescriptionSheet';
import { PlanDayCard } from '@/components/plans/PlanDayCard';
import { MotionReveal } from '@/components/ui/MotionReveal';
import {
  Card,
  EmptyState,
  ErrorState,
  Screen,
  SegmentedControl,
  SkeletonCard,
  Text,
} from '@/components/ui';
import {
  parseSupplements,
  useMealPlan,
  useUserProfile,
  useWorkoutPlan,
  type PlanExercise,
} from '@/hooks/usePlans';
import { usePlanProgress } from '@/hooks/usePlanProgress';
import { relativeDays, usePlanProvenance } from '@/hooks/usePlanProvenance';
import { formatTypeLabel } from '@/lib/workout-constants';
import { spacing, useTheme } from '@/theme';

type Top = 'training' | 'nutrition';
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

export default function PlansScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [top, setTop] = useState<Top>('training');
  const [selectedExercise, setSelectedExercise] = useState<PlanExercise | null>(null);

  const { data: profile, isLoading: profileLoading, isError, refetch } = useUserProfile();
  const { data: plan, isLoading: planLoading, isError: planIsError, refetch: refetchPlan } = useWorkoutPlan();
  const {
    data: meal,
    isLoading: mealLoading,
    isError: mealIsError,
    refetch: refetchMeal,
  } = useMealPlan();
  const { hasChanged, markSeen, ready: provenanceReady, updatedAt } = usePlanProvenance(plan?.days);
  const progress = usePlanProgress(plan?.days ?? []);
  const pointer = parseActivePlan(profile?.active_workout_plan);
  const hasRenderedTrainingPlan =
    top === 'training' &&
    !profileLoading &&
    !planLoading &&
    !progress.isLoading &&
    !isError &&
    !planIsError &&
    plan?.source === 'user' &&
    !progress.isError &&
    provenanceReady &&
    Boolean(pointer && plan?.days.length);

  // A plan is seen only after its populated Training view has committed.
  useEffect(() => {
    if (hasRenderedTrainingPlan && updatedAt) markSeen();
  }, [hasRenderedTrainingPlan, markSeen, updatedAt]);

  const supplements = parseSupplements(profile?.supplements_data ?? null);
  const showNutritionExtras = Boolean(profile) && (!mealIsError || Boolean(meal)) && !mealLoading;

  const days = plan?.days ?? [];
  const focusedDay = plan?.source === 'user' && !progress.isError ? days.find((day) => {
    const status = progress.statuses[day.day_number];
    return status === 'today' || status === 'active';
  }) : undefined;
  const orderedDays = focusedDay
    ? [focusedDay, ...days.filter((day) => day.id !== focusedDay.id)]
    : days;

  return (
    <Screen archetype="root">
      <View style={{ gap: spacing.lg }}>
        <Text variant="h1">Your plan</Text>

        <SegmentedControl
          label="Plan type"
          value={top}
          onChange={setTop}
          segments={[
            { value: 'training', label: 'Training' },
            { value: 'nutrition', label: 'Nutrition' },
          ]}
        />

        <MotionReveal revision={top} style={{ gap: spacing.md }} testID="plan-section-content">
        {top === 'training' && isError ? (
          <ErrorState title={profile ? "Profile couldn’t refresh" : "Profile didn’t load"} message="Retry to check your plan assignment." onRetry={() => void refetch()} retryLabel="Retry profile" />
        ) : null}
        {top === 'training' && planIsError ? (
          <ErrorState title={plan ? "Training plan couldn’t refresh" : "Training plan didn’t load"} message={plan ? "Your saved plan is shown below." : "Retry to load your training plan."} onRetry={() => void refetchPlan()} retryLabel="Retry training plan" />
        ) : null}
        {top === 'training' && progress.isError ? (
          <ErrorState title="Training history couldn’t load" message="Retry to check which sessions are logged." onRetry={() => void progress.refetch()} retryLabel="Retry training history" />
        ) : null}
        {top === 'training' ? (
          (profileLoading && !profile) || (planLoading && !plan) ? (
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
                  <Text variant="bodySm" tone="muted">Preview these exercises. Your coach can assign a plan tailored to you before you start.</Text>
                ) : null}
                {updatedAt && plan?.source === 'user' ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Text variant="bodySm" tone={hasChanged ? 'primary' : 'muted'}>
                      {hasChanged ? 'Updated by your coach' : 'Last updated'}{' '}
                      {relativeDays(updatedAt)}
                    </Text>
                    {hasChanged ? (
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: colors.primary,
                        }}
                      />
                    ) : null}
                  </View>
                ) : null}
              </Card>

              {orderedDays.length ? (
                orderedDays.map((d) => (
                  <View key={d.id} style={{ gap: spacing.sm }}>
                    <PlanDayCard
                      testID={
                        progress.statuses[d.day_number] === 'today' ||
                        progress.statuses[d.day_number] === 'active'
                          ? 'plan-current-day'
                          : undefined
                      }
                      day={d}
                      status={plan?.source !== 'user' || progress.isError || progress.isLoading ? 'unknown' : progress.statuses[d.day_number] ?? 'upcoming'}
                      onStart={plan?.source === 'user' ? () =>
                        router.push({
                          pathname: '/(app)/logger',
                          params: { day: String(d.day_number) },
                        }) : undefined
                      }
                      onShowDetails={setSelectedExercise}
                    />
                  </View>
                ))
              ) : (
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
          )
        ) : (
          <View style={{ gap: spacing.md }}>
            {mealIsError ? <ErrorState title={meal ? "Meal plan couldn’t refresh" : "Meal plan didn’t load"} onRetry={() => void refetchMeal()} retryLabel="Retry meal plan" /> : null}
            {isError ? <ErrorState title="Nutrition notes couldn’t load" onRetry={() => void refetch()} retryLabel="Retry profile" /> : null}
            {(mealLoading && !meal) || (profileLoading && !profile) ? (
              <SkeletonCard lines={4} />
            ) : (mealIsError && !meal) || (isError && !profile) ? null : !meal?.pointer ? (
              <Card>
                <EmptyState
                  icon={Utensils}
                  title="No meal plan yet"
                  message="No meal plan has been assigned yet. Please contact your coach."
                />
              </Card>
            ) : (
              <>
                <Card style={{ gap: spacing.xs }}>
                  <Text variant="label" tone="muted">Daily target</Text>
                  <Text variant="h2" numeric>
                    {meal.pointer.calories} kcal · {meal.pointer.dietType}
                  </Text>
                </Card>
                {meal.meals.map((m) => (
                  <Card key={m.meal_type} style={{ gap: spacing.sm }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        gap: spacing.sm,
                      }}
                    >
                      <Text variant="h2">{m.meal_type}</Text>
                      {m.calories ? (
                        <Text variant="bodySm" tone="muted" numeric>{m.calories} kcal</Text>
                      ) : null}
                    </View>
                    {m.description ? <Text variant="bodySm">{m.description}</Text> : null}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
                      {([['P', m.protein], ['C', m.carbs], ['F', m.fats]] as const).map(
                        ([key, value]) => value !== null ? (
                          <Text key={key} variant="bodySm" tone="muted" numeric>
                            {key} {value}g
                          </Text>
                        ) : null,
                      )}
                    </View>
                  </Card>
                ))}
                {meal.meals.length ? (
                  <Card>
                    <Text variant="bodySm" tone="muted" numeric>
                      Daily total {meal.meals.reduce((sum, m) => sum + (m.calories ?? 0), 0)} kcal ·{' '}
                      {meal.meals.reduce((sum, m) => sum + (m.protein ?? 0), 0)}g protein
                    </Text>
                  </Card>
                ) : null}
              </>
            )}

            {showNutritionExtras ? (
              <Card style={{ gap: spacing.md }}>
                <Text variant="h2">Supplements</Text>
                {supplements.length ? (
                  supplements.map((supplement, index) => (
                    <View
                      key={supplement.id ?? index}
                      style={{
                        gap: spacing.xs,
                        paddingTop: index === 0 ? 0 : spacing.md,
                        borderTopWidth: index === 0 ? 0 : 1,
                        borderTopColor: colors.border,
                      }}
                    >
                      <Text>{supplement.name}</Text>
                      <Text variant="bodySm" tone="muted">
                        {supplement.serving}{supplement.timing ? ` · ${supplement.timing}` : ''}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text variant="bodySm" tone="muted">Nothing has been prescribed yet.</Text>
                )}
              </Card>
            ) : null}

            {showNutritionExtras &&
            (profile?.nutrition_note || profile?.cardio_note || profile?.steps_note) ? (
              <Card style={{ gap: spacing.md }}>
                <Text variant="h2">Coach notes</Text>
                {profile.nutrition_note ? <Text variant="bodySm">{profile.nutrition_note}</Text> : null}
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
        </MotionReveal>
      </View>

      <ExercisePrescriptionSheet
        visible={selectedExercise !== null}
        exercise={selectedExercise}
        onClose={() => setSelectedExercise(null)}
      />
    </Screen>
  );
}
