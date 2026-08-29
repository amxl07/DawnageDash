import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { ChevronDown, ClipboardList, Play, Utensils } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  Button,
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
  type PlanDay,
} from '@/hooks/usePlans';
import { formatTypeLabel } from '@/lib/workout-constants';
import { iconSize, spacing, useTheme } from '@/theme';

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

function DayCard({ day, onLog }: { day: PlanDay; onLog: () => void }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Card style={{ gap: spacing.md }}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={`Day ${day.day_number}${day.focus ? `, ${day.focus}` : ''}, ${day.exercises.length} exercises`}
        accessibilityState={{ expanded: open }}
        style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44 }}
      >
        <View style={{ flex: 1 }}>
          <Text variant="h2">Day {day.day_number}</Text>
          {day.focus ? (
            <Text variant="bodySm" tone="muted">
              {day.focus} · {day.exercises.length} exercises
            </Text>
          ) : null}
        </View>
        <ChevronDown
          size={iconSize.md}
          color={colors.mutedForeground}
          strokeWidth={2}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
          accessible={false}
        />
      </Pressable>

      {open ? (
        <View style={{ gap: spacing.md }}>
          {day.exercises.map((ex, i) => (
            <View
              key={ex.id ?? i}
              style={{
                gap: spacing.xs,
                paddingTop: spacing.md,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Text style={{ flex: 1 }}>{ex.name}</Text>
                {ex.videoLink ? (
                  <Pressable
                    onPress={() => void WebBrowser.openBrowserAsync(ex.videoLink!)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={`Watch demo for ${ex.name}`}
                    style={{ minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' }}
                  >
                    <Play size={iconSize.md} color={colors.primary} strokeWidth={2} />
                  </Pressable>
                ) : null}
              </View>
              <Text variant="bodySm" tone="muted" numeric>
                {ex.sets} × {ex.reps || '—'}
              </Text>
              {ex.notes ? (
                <Text variant="bodySm" tone="muted">
                  {ex.notes}
                </Text>
              ) : null}
            </View>
          ))}

          {/* The plan and the logger are the same task seen twice. */}
          <Button label={`Log Day ${day.day_number}`} variant="secondary" onPress={onLog} />
        </View>
      ) : null}
    </Card>
  );
}

export default function PlansScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [top, setTop] = useState<Top>('training');

  const { data: profile, isLoading: profileLoading, isError, refetch } = useUserProfile();
  const { data: plan, isLoading: planLoading } = useWorkoutPlan();
  const { data: meal, isLoading: mealLoading } = useMealPlan();

  const supplements = parseSupplements(profile?.supplements_data ?? null);

  if (profileLoading || planLoading) {
    return (
      <Screen>
        <SkeletonCard lines={2} />
        <View style={{ height: spacing.base }} />
        <SkeletonCard lines={4} />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState onRetry={refetch} />
      </Screen>
    );
  }

  const pointer = parseActivePlan(profile?.active_workout_plan);

  return (
    <Screen>
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
              </Card>

              {plan?.days.length ? (
                plan.days.map((d) => (
                  <DayCard
                    key={d.id}
                    day={d}
                    onLog={() =>
                      router.push({
                        pathname: '/(app)/logger',
                        params: { day: String(d.day_number) },
                      })
                    }
                  />
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
            {mealLoading ? (
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
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text variant="h2">{m.meal_type}</Text>
                      {m.calories ? (
                        <Text variant="bodySm" tone="muted" numeric>{m.calories} kcal</Text>
                      ) : null}
                    </View>
                    {m.description ? <Text variant="bodySm">{m.description}</Text> : null}
                    <View style={{ flexDirection: 'row', gap: spacing.md }}>
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

            {profile?.nutrition_note ? (
              <Card style={{ gap: spacing.xs }}>
                <Text variant="h2">Coach notes</Text>
                <Text variant="bodySm">{profile.nutrition_note}</Text>
              </Card>
            ) : null}
          </View>
        )}
      </View>
    </Screen>
  );
}
