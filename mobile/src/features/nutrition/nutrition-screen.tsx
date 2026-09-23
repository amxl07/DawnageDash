import { Utensils } from 'lucide-react-native';
import { View } from 'react-native';

import { Card, EmptyState, ErrorState, Screen, SkeletonCard, Text } from '@/components/ui';
import { parseSupplements, useMealPlan, useUserProfile } from '@/hooks/usePlans';
import { spacing, useTheme } from '@/theme';

export function NutritionScreen() {
  const { colors } = useTheme();
  const { data: profile, isLoading: profileLoading, isError, refetch } = useUserProfile();
  const {
    data: meal,
    isLoading: mealLoading,
    isError: mealIsError,
    refetch: refetchMeal,
  } = useMealPlan();
  const supplements = parseSupplements(profile?.supplements_data ?? null);
  const showNutritionExtras = Boolean(profile) && (!mealIsError || Boolean(meal)) && !mealLoading;

  return (
    <Screen archetype="root">
      <View style={{ gap: spacing.lg }}>
        <Text variant="h1">Nutrition</Text>
        <View style={{ gap: spacing.md }}>
          {mealIsError ? (
            <ErrorState
              title={meal ? "Meal plan couldn’t refresh" : "Meal plan didn’t load"}
              onRetry={() => void refetchMeal()}
              retryLabel="Retry meal plan"
            />
          ) : null}
          {isError ? (
            <ErrorState
              title="Nutrition notes couldn’t load"
              onRetry={() => void refetch()}
              retryLabel="Retry profile"
            />
          ) : null}

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
                <Text variant="h2" numeric>{meal.pointer.calories} kcal · {meal.pointer.dietType}</Text>
              </Card>
              {meal.meals.map((item) => (
                <Card key={item.meal_type} style={{ gap: spacing.sm }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm }}>
                    <Text variant="h2">{item.meal_type}</Text>
                    {item.calories ? <Text variant="bodySm" tone="muted" numeric>{item.calories} kcal</Text> : null}
                  </View>
                  {item.description ? <Text variant="bodySm">{item.description}</Text> : null}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
                    {([['P', item.protein], ['C', item.carbs], ['F', item.fats]] as const).map(
                      ([key, value]) => value !== null ? (
                        <Text key={key} variant="bodySm" tone="muted" numeric>{key} {value}g</Text>
                      ) : null,
                    )}
                  </View>
                </Card>
              ))}
              {meal.meals.length ? (
                <Card>
                  <Text variant="bodySm" tone="muted" numeric>
                    Daily total {meal.meals.reduce((sum, item) => sum + (item.calories ?? 0), 0)} kcal ·{' '}
                    {meal.meals.reduce((sum, item) => sum + (item.protein ?? 0), 0)}g protein
                  </Text>
                </Card>
              ) : null}
            </>
          )}

          {showNutritionExtras ? (
            <Card style={{ gap: spacing.md }}>
              <Text variant="h2">Supplements</Text>
              {supplements.length ? supplements.map((supplement, index) => (
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
              )) : <Text variant="bodySm" tone="muted">Nothing has been prescribed yet.</Text>}
            </Card>
          ) : null}

          {showNutritionExtras && (profile?.nutrition_note || profile?.cardio_note || profile?.steps_note) ? (
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
      </View>
    </Screen>
  );
}
