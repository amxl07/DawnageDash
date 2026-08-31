import { z } from 'zod';

import { ApiError } from '@/data/api-error';
import type { FitnessRepository } from '@/data/fitness-repository';
import {
  createdFoodEntryWireSchema,
  dailySummaryWireSchema,
  foodEntryWireSchema,
  foodSearchWireSchema,
  mealTypesWireSchema,
} from '@/domain/schemas';
import type {
  AddFoodEntryInput,
  DailySummary,
  Food,
  FoodEntry,
  FoodSearchResult,
  MealType,
} from '@/domain/models';

export interface ConnectedRepositorySession {
  mode: 'connected';
  serverUrl: string;
  token: string;
  email: string;
}

export type FetchImplementation = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

function apiErrorFromUnknown(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError('network', 'Unable to reach the server.');
}

function mapFoodEntry(entry: z.infer<typeof foodEntryWireSchema>): FoodEntry {
  const scale = entry.quantity / entry.serving_size;

  return {
    calories: entry.calories * scale,
    carbohydrates: entry.carbs * scale,
    fat: entry.fat * scale,
    foodId: entry.food_id,
    foodName: entry.food_name,
    id: entry.id,
    mealTypeId: entry.meal_type_id,
    protein: entry.protein * scale,
    quantity: entry.quantity,
    unit: entry.unit,
  };
}

function mapDailySummary(
  date: string,
  summary: z.infer<typeof dailySummaryWireSchema>,
): DailySummary {
  const entries = summary.foodEntries.map(mapFoodEntry);
  const meals = new Map<
    string,
    { mealTypeId: string; name: string; entries: FoodEntry[] }
  >();

  summary.foodEntries.forEach((entry, index) => {
    const existing = meals.get(entry.meal_type_id);
    if (existing) {
      existing.entries.push(entries[index]);
      return;
    }

    meals.set(entry.meal_type_id, {
      entries: [entries[index]],
      mealTypeId: entry.meal_type_id,
      name: entry.meal_type,
    });
  });

  const calculatedNutrition = entries.reduce(
    (total, entry) => ({
      calories: total.calories + entry.calories,
      carbohydrates: total.carbohydrates + entry.carbohydrates,
      fat: total.fat + entry.fat,
      protein: total.protein + entry.protein,
    }),
    { calories: 0, carbohydrates: 0, fat: 0, protein: 0 },
  );

  return {
    calories: {
      consumed: summary.calorieBalance?.eaten ?? calculatedNutrition.calories,
      goal: summary.adjustedGoals?.calories ?? summary.goals.calories,
    },
    date,
    macros: {
      carbohydrates: calculatedNutrition.carbohydrates,
      fat: calculatedNutrition.fat,
      protein: calculatedNutrition.protein,
    },
    meals: [...meals.values()],
  };
}

function mapFoodSearch(result: z.infer<typeof foodSearchWireSchema>): FoodSearchResult {
  const items: Food[] = result.foods.map((food) => ({
    brand: food.brand,
    id: food.id,
    name: food.name,
    nutrition: {
      calories: food.default_variant.calories,
      carbohydrates: food.default_variant.carbs,
      fat: food.default_variant.fat,
      protein: food.default_variant.protein,
    },
    servingSize: food.default_variant.serving_size,
    servingUnit: food.default_variant.serving_unit,
    variantId: food.default_variant.id,
  }));

  return { items, total: result.totalCount };
}

function mapMealTypes(types: z.infer<typeof mealTypesWireSchema>): MealType[] {
  return types.map((mealType) => ({ id: mealType.id, name: mealType.name }));
}

export function createConnectedFitnessRepository(
  session: ConnectedRepositorySession,
  fetchImpl: FetchImplementation = fetch,
): FitnessRepository {
  const baseUrl = session.serverUrl.replace(/\/$/, '');
  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${session.token}`,
    'X-Meal-Model-Version': '2',
  };

  async function request<T>(
    path: string,
    schema: z.ZodType<T>,
    init?: RequestInit,
  ): Promise<T> {
    let response: Response;

    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        ...init,
        headers: {
          ...headers,
          ...init?.headers,
        },
      });
    } catch (error) {
      throw apiErrorFromUnknown(error);
    }

    if (!response.ok) {
      throw new ApiError('http', 'The server could not complete the request.', response.status);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ApiError('data-format', 'The server returned invalid data.', response.status);
    }

    const result = schema.safeParse(body);
    if (!result.success) {
      throw new ApiError('data-format', 'The server returned invalid data.', response.status);
    }

    return result.data;
  }

  return {
    getDailySummary(date) {
      return request(
        `/api/daily-summary?date=${encodeURIComponent(date)}`,
        dailySummaryWireSchema,
      ).then((summary) => mapDailySummary(date, summary));
    },
    searchFoods(term) {
      const query = new URLSearchParams({
        searchTerm: term,
        currentPage: '1',
        itemsPerPage: '20',
        sortBy: 'name:asc',
      });
      return request(
        `/api/foods/foods-paginated?${query.toString()}`,
        foodSearchWireSchema,
      ).then(mapFoodSearch);
    },
    getMealTypes() {
      return request('/api/meal-types', mealTypesWireSchema).then(mapMealTypes);
    },
    addFoodEntry(input: AddFoodEntryInput) {
      return request('/api/food-entries/', createdFoodEntryWireSchema, {
        body: JSON.stringify({
          entry_date: input.date,
          food_id: input.foodId,
          meal_type_id: input.mealTypeId,
          quantity: input.quantity,
          unit: input.unit,
          variant_id: input.variantId,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }).then(mapFoodEntry);
    },
  };
}
