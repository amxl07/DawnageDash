import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { DisclosureChevron } from '@/components/ui/DisclosureChevron';
import type { Meal } from '@/hooks/usePlans';
import { HIT_SLOP_MIN, radius, spacing, useTheme } from '@/theme';

function isListedAmount(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function sumListedAmounts(meals: Meal[], nutrient: 'calories' | 'protein') {
  const listed = meals.map((meal) => meal[nutrient]).filter(isListedAmount);
  return { total: listed.reduce((sum, value) => sum + value, 0), count: listed.length };
}

export function MealPlanDetails({ meals, targetCalories }: { meals: Meal[]; targetCalories: number }) {
  const { colors } = useTheme();
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const calories = sumListedAmounts(meals, 'calories');
  const protein = sumListedAmounts(meals, 'protein');
  const missingCalories = meals.length - calories.count;
  const hasTarget = isListedAmount(targetCalories);
  const difference = !missingCalories && hasTarget ? calories.total - targetCalories : null;
  const caloriesLabel = calories.count
    ? `Planned meals ${calories.total} kcal${missingCalories ? ' (partial)' : ''}`
    : 'Meal calories not listed';
  const comparisonLabel = missingCalories
    ? `Calories missing for ${missingCalories} of ${meals.length} meal${meals.length === 1 ? '' : 's'}`
    : difference === null
      ? null
      : difference === 0
        ? null
        : `${Math.abs(difference)} kcal ${difference < 0 ? 'below' : 'above'} daily target`;

  if (!meals.length) {
    return <Card><Text variant="bodySm" tone="muted">No meal details listed yet.</Text></Card>;
  }

  return <View style={{ gap: spacing.md }}>
    <Card style={{ gap: spacing.md }}>
      {meals.map((meal, index) => <MealDetailsRow key={meal.meal_type} meal={meal} divided={index > 0} />)}
    </Card>
    <View style={{ gap: spacing.xs }}>
      <Text variant="bodySm" tone="muted" numeric>
        {caloriesLabel}
      </Text>
      {comparisonLabel ? (
        <Text variant="bodySm" tone="muted" numeric>{comparisonLabel}</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Nutrition details"
        accessibilityHint={detailsExpanded ? 'Hide listed protein and target explanation' : 'Show listed protein and target explanation'}
        accessibilityState={{ expanded: detailsExpanded }}
        onPress={() => setDetailsExpanded((current) => !current)}
        style={({ pressed }) => ({
          minHeight: HIT_SLOP_MIN,
          paddingVertical: spacing.sm,
          borderRadius: radius.sm,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
          backgroundColor: pressed ? colors.pressed : 'transparent',
        })}
      >
        <Text variant="bodySm" tone="muted" style={{ flexShrink: 1 }}>Nutrition details</Text>
        <DisclosureChevron expanded={detailsExpanded} />
      </Pressable>
      {detailsExpanded ? <View style={{ gap: spacing.xs }}>
        <Text variant="bodySm" tone="muted" numeric>
          {protein.count
            ? `Listed protein · ${protein.total} g${protein.count < meals.length ? ' (partial)' : ''}`
            : 'Meal protein not listed'}
        </Text>
        <Text variant="bodySm" tone="muted">
          {'Amounts reflect your prescribed meal plan. '}
          {missingCalories ? 'A full daily comparison isn’t available. ' : ''}
          {hasTarget
            ? 'Your daily target is prescribed separately from meal amounts.'
            : 'A daily calorie target hasn’t been listed for comparison.'}
          {difference !== null && difference !== 0 ? ' Confirm this difference with your coach.' : ''}
        </Text>
      </View> : null}
    </View>
  </View>;
}

function MealDetailsRow({ meal, divided }: { meal: Meal; divided: boolean }) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const caloriesLabel = isListedAmount(meal.calories) ? `${meal.calories} kcal` : 'Calories not listed';

  return <View style={{ gap: spacing.sm, paddingTop: divided ? spacing.md : 0, borderTopWidth: divided ? 1 : 0, borderTopColor: colors.border }}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${meal.meal_type}, ${isListedAmount(meal.calories) ? caloriesLabel : 'calories not listed'}`}
      accessibilityHint={expanded ? 'Hide prescribed meal details' : 'Show prescribed meal details'}
      accessibilityState={{ expanded }}
      onPress={() => setExpanded((current) => !current)}
      style={({ pressed }) => ({
        minHeight: HIT_SLOP_MIN,
        paddingVertical: spacing.sm,
        borderRadius: radius.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: pressed ? colors.pressed : 'transparent',
      })}
    >
      <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
        <Text variant="label" style={{ flexShrink: 1 }}>{meal.meal_type}</Text>
        <Text variant="bodySm" tone="muted" numeric>{caloriesLabel}</Text>
      </View>
      <DisclosureChevron expanded={expanded} />
    </Pressable>
    {expanded ? <View style={{ gap: spacing.sm, paddingBottom: spacing.sm }}>
      <Text variant="bodySm" tone={meal.description ? 'default' : 'muted'}>{meal.description || 'No meal description listed.'}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {![meal.protein, meal.carbs, meal.fats].some(isListedAmount) ? <Text variant="bodySm" tone="muted">Macros not provided</Text> : ([['Protein', meal.protein], ['Carbs', meal.carbs], ['Fat', meal.fats]] as const).map(([label, value]) => (
          <Text key={label} variant="bodySm" tone="muted" numeric>{isListedAmount(value) ? `${label} ${value} g` : `${label} not listed`}</Text>
        ))}
      </View>
    </View> : null}
  </View>;
}
