import { z } from 'zod';

const finiteNumber = z.number().finite();
const nonEmptyString = z.string().min(1);
const macroGoalsWireSchema = z.object({
  calories: finiteNumber,
  carbs: finiteNumber,
  fat: finiteNumber,
  protein: finiteNumber,
});
const supplementTotalsWireSchema = z.object({
  calories: finiteNumber.nullish(),
  carbs: finiteNumber.nullish(),
  fat: finiteNumber.nullish(),
  protein: finiteNumber.nullish(),
}).passthrough();

export const foodEntryWireSchema = z.object({
  calories: finiteNumber.nullish(),
  carbs: finiteNumber.nullish(),
  entry_date: z.string().date(),
  fat: finiteNumber.nullish(),
  food_id: nonEmptyString.nullish(),
  food_name: nonEmptyString.nullish(),
  id: nonEmptyString,
  meal_id: nonEmptyString.nullish(),
  meal_type_id: nonEmptyString,
  protein: finiteNumber.nullish(),
  quantity: finiteNumber.nonnegative(),
  serving_size: finiteNumber.nullish(),
  unit: nonEmptyString.nullish(),
  variant_id: nonEmptyString.nullish(),
});

export const dailySummaryWireSchema = z.object({
  adjustedGoals: macroGoalsWireSchema.nullable().optional(),
  calorieBalance: z.object({ eaten: finiteNumber.optional() }).optional(),
  exerciseSessions: z.array(z.unknown()),
  foodEntries: z.array(
    foodEntryWireSchema.extend({
      meal_type: nonEmptyString,
    }),
  ),
  goals: macroGoalsWireSchema,
  stepCalories: z.unknown(),
  supplementTotals: supplementTotalsWireSchema.nullish(),
  waterIntake: z.unknown(),
});

export const foodSearchWireSchema = z.object({
  foods: z.array(
    z.object({
      brand: nonEmptyString.nullish(),
      default_variant: z.object({
        calories: finiteNumber.nullish(),
        carbs: finiteNumber.nullish(),
        fat: finiteNumber.nullish(),
        id: nonEmptyString,
        protein: finiteNumber.nullish(),
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
    is_visible: z.boolean().nullish(),
    name: nonEmptyString,
    show_in_quick_log: z.boolean().nullish(),
  }),
);

export const signInWireSchema = z.object({
  email: nonEmptyString.optional(),
  token: nonEmptyString.optional(),
  twoFactorRedirect: z.boolean().optional(),
  user: z.object({
    email: nonEmptyString.optional(),
  }).nullable().optional(),
});

export const createdFoodEntryWireSchema = foodEntryWireSchema;
