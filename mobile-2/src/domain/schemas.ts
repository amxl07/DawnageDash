import { z } from 'zod';

const finiteNumber = z.number().finite();
const nonEmptyString = z.string().min(1);

export const foodEntryWireSchema = z.object({
  calories: finiteNumber,
  carbs: finiteNumber,
  fat: finiteNumber,
  food_id: nonEmptyString,
  food_name: nonEmptyString,
  id: nonEmptyString,
  meal_type_id: nonEmptyString,
  protein: finiteNumber,
  quantity: finiteNumber.nonnegative(),
  serving_size: finiteNumber.positive(),
  unit: nonEmptyString,
});

export const dailySummaryWireSchema = z.object({
  adjustedGoals: z.object({ calories: finiteNumber }).nullable().optional(),
  calorieBalance: z.object({ eaten: finiteNumber.optional() }).optional(),
  exerciseSessions: z.array(z.unknown()),
  foodEntries: z.array(
    foodEntryWireSchema.extend({
      meal_type: nonEmptyString,
    }),
  ),
  goals: z.object({ calories: finiteNumber }),
  stepCalories: z.unknown(),
  supplementTotals: z.unknown(),
  waterIntake: z.unknown(),
});

export const foodSearchWireSchema = z.object({
  foods: z.array(
    z.object({
      brand: nonEmptyString.optional(),
      default_variant: z.object({
        calories: finiteNumber,
        carbs: finiteNumber,
        fat: finiteNumber,
        id: nonEmptyString,
        protein: finiteNumber,
        serving_size: finiteNumber.positive(),
        serving_unit: nonEmptyString,
      }),
      id: nonEmptyString,
      name: nonEmptyString,
    }),
  ),
  totalCount: z.number().int().nonnegative(),
});

export const mealTypesWireSchema = z.array(
  z.object({
    id: nonEmptyString,
    name: nonEmptyString,
  }),
);

export const createdFoodEntryWireSchema = foodEntryWireSchema.extend({
  variant_id: nonEmptyString,
});
