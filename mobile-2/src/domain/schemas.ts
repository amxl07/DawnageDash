import { z } from 'zod';

const nutritionSchema = z.object({
  calories: z.number().finite(),
  carbohydrates: z.number().finite(),
  fat: z.number().finite(),
  protein: z.number().finite(),
});

export const foodEntrySchema = nutritionSchema.extend({
  foodId: z.string().min(1),
  foodName: z.string().min(1),
  id: z.string().min(1),
  mealTypeId: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
});

export const dailySummarySchema = z.object({
  calories: z.object({
    consumed: z.number().finite(),
    goal: z.number().positive(),
  }),
  date: z.string().date(),
  macros: z.object({
    carbohydrates: z.number().finite(),
    fat: z.number().finite(),
    protein: z.number().finite(),
  }),
  meals: z.array(
    z.object({
      entries: z.array(foodEntrySchema),
      mealTypeId: z.string().min(1),
      name: z.string().min(1),
    }),
  ),
});

export const foodSchema = nutritionSchema.extend({
  brand: z.string().min(1).optional(),
  id: z.string().min(1),
  name: z.string().min(1),
  servingSize: z.number().positive(),
  servingUnit: z.string().min(1),
}).transform(({ calories, carbohydrates, fat, protein, ...food }) => ({
  ...food,
  nutrition: { calories, carbohydrates, fat, protein },
}));

export const foodSearchResultSchema = z.object({
  items: z.array(foodSchema),
  total: z.number().int().nonnegative(),
});

export const mealTypesSchema = z.array(
  z.object({
    id: z.string().min(1),
    name: z.string().min(1),
  }),
);
