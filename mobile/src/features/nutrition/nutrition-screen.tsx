import { Utensils } from 'lucide-react-native';
import { View } from 'react-native';

import { Section } from '@/components/ui/Section';
import { Card, EmptyState, ErrorState, Screen, SkeletonCard, Text } from '@/components/ui';
import { useMealPlan, useUserProfile } from '@/hooks/usePlans';
import { readSupplements } from '@/lib/supplements';
import { spacing, useTheme } from '@/theme';
import { MealPlanDetails } from './MealPlanDetails';

export function NutritionScreen() {
  const { colors } = useTheme();
  const { data: profile, isLoading: profileLoading, isError, refetch } = useUserProfile();
  const {
    data: meal,
    isLoading: mealLoading,
    isError: mealIsError,
    refetch: refetchMeal,
  } = useMealPlan();
  const supplementResult = readSupplements(profile?.supplements_data ?? null);
  const supplements = supplementResult.kind === 'ready' ? supplementResult.items : [];
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
              title="Nutrition notes and supplements couldn’t load"
              onRetry={() => void refetch()}
              retryLabel="Retry profile"
            />
          ) : null}
          {profile && !isError && supplementResult.kind === 'invalid' ? (
            <ErrorState
              title="Supplements couldn’t be read"
              onRetry={() => void refetch()}
              retryLabel="Retry supplements"
            />
          ) : null}

          {(mealLoading && !meal) || (profileLoading && !profile) ? (
            <SkeletonCard lines={4} />
          ) : (mealIsError && !meal) || (isError && !profile) ? null : !meal?.pointer ? (
            <Card>
              <EmptyState
                icon={Utensils}
                title="No meal plan yet"
                message="Your meals will appear here when assigned."
              />
            </Card>
          ) : (
            <>
              <Card style={{ gap: spacing.xs }}>
                <Text variant="label" tone="muted">Prescribed daily target</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: spacing.sm }}>
                  <Text variant="metric" numeric>{Number.isFinite(meal.pointer.calories) ? meal.pointer.calories : 'Not listed'}</Text>
                  {Number.isFinite(meal.pointer.calories) ? <Text variant="bodySm" tone="muted">kcal / day</Text> : null}
                </View>
                <Text variant="bodySm" tone="muted">{meal.pointer.dietType}</Text>
              </Card>
              <MealPlanDetails meals={meal.meals} targetCalories={meal.pointer.calories} />
            </>
          )}

          {showNutritionExtras && supplements.length > 0 ? (
            <Section title="Supplements">
              {supplements.map((supplement, index) => (
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
              ))}
            </Section>
          ) : null}

          {showNutritionExtras && profile?.nutrition_note ? (
            <Section title="Coach notes">
              {profile.nutrition_note ? <Text variant="bodySm">{profile.nutrition_note}</Text> : null}

            </Section>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}
