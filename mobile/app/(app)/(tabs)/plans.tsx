import { useRouter } from 'expo-router';
import { ClipboardList, Utensils } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { CoachBadge } from '@/components/coach/CoachBadge';
import { ExercisePrescriptionSheet } from '@/components/plans/ExercisePrescriptionSheet';
import { PlanDayCard } from '@/components/plans/PlanDayCard';
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
import { HIT_SLOP_MIN, spacing, useTheme } from '@/theme';

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
  const { data: plan, isLoading: planLoading } = useWorkoutPlan();
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
    !progress.isError &&
    provenanceReady &&
    Boolean(pointer && plan?.days.length);

  // A plan is seen only after its populated Training view has committed.
  useEffect(() => {
    if (hasRenderedTrainingPlan && updatedAt) markSeen();
  }, [hasRenderedTrainingPlan, markSeen, updatedAt]);

  const supplements = parseSupplements(profile?.supplements_data ?? null);
  const showNutritionExtras = !mealIsError && !mealLoading;

  if (
    profileLoading ||
    (top === 'training' && (planLoading || progress.isLoading))
  ) {
    return (
      <Screen archetype="root">
        <SkeletonCard lines={2} />
        <View style={{ height: spacing.base }} />
        <SkeletonCard lines={4} />
      </Screen>
    );
  }

  if (isError || (top === 'training' && progress.isError)) {
    return (
      <Screen archetype="root">
        <ErrorState
          onRetry={() => {
            void refetch();
            if (progress.isError) void progress.refetch();
          }}
        />
      </Screen>
    );
  }

  const days = plan?.days ?? [];
  const focusedDay = days.find((day) => {
    const status = progress.statuses[day.day_number];
    return status === 'today' || status === 'active';
  });
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

        {top === 'training' ? (
          !pointer ? (
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
                  Assigned plan
                </Text>
                <Text variant="h2">
                  {pointer.level} · {formatTypeLabel(pointer.workoutType)}
                  {pointer.subCategory ? ` · ${formatTypeLabel(pointer.subCategory)}` : ''} ·{' '}
                  {pointer.daysPerWeek}-day
                </Text>
                <CoachBadge caption="Assigned by" />
                {updatedAt ? (
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
                      status={progress.statuses[d.day_number] ?? 'upcoming'}
                      onStart={() =>
                        router.push({
                          pathname: '/(app)/logger',
                          params: { day: String(d.day_number) },
                        })
                      }
                    />
                    {d.exercises.length ? (
                      <Card style={{ gap: spacing.xs }}>
                        <Text variant="label" tone="muted">
                          Exercise details
                        </Text>
                        {d.exercises.map((exercise, exerciseIndex) => (
                          <View
                            key={exercise.id ?? exerciseIndex}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
                          >
                            <Text variant="bodySm" style={{ flex: 1 }}>
                              {exercise.name}
                            </Text>
                            <Pressable
                              onPress={() => setSelectedExercise(exercise)}
                              accessibilityRole="button"
                              accessibilityLabel={`Show details for ${exercise.name}`}
                              style={{
                                minWidth: HIT_SLOP_MIN,
                                minHeight: HIT_SLOP_MIN,
                                justifyContent: 'center',
                              }}
                            >
                              <Text variant="bodySm" tone="primary">
                                Details
                              </Text>
                            </Pressable>
                          </View>
                        ))}
                      </Card>
                    ) : null}
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
            {mealIsError ? (
              <ErrorState onRetry={() => void refetchMeal()} />
            ) : mealLoading ? (
              <SkeletonCard lines={4} />
            ) : !meal?.pointer ? (
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
      </View>

      <ExercisePrescriptionSheet
        visible={selectedExercise !== null}
        exercise={selectedExercise}
        onClose={() => setSelectedExercise(null)}
      />
    </Screen>
  );
}
