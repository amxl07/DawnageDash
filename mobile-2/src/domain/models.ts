export interface Nutrition {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}

export interface Food {
  id: string;
  variantId: string;
  name: string;
  brand?: string;
  servingSize: number;
  servingUnit: string;
  nutrition: Nutrition;
}

export interface FoodSearchResult {
  items: Food[];
  total: number;
}

export interface MealType {
  id: string;
  name: string;
}

export interface FoodEntry extends Nutrition {
  id: string;
  foodId: string;
  foodName: string;
  mealTypeId: string;
  quantity: number;
  unit: string;
}

export interface DailyMeal {
  mealTypeId: string;
  name: string;
  entries: FoodEntry[];
}

export interface DailySummary {
  date: string;
  calories: {
    consumed: number;
    goal: number;
  };
  macros: Omit<Nutrition, 'calories'>;
  meals: DailyMeal[];
}

export interface AddFoodEntryInput {
  date: string;
  foodId: string;
  variantId: string;
  mealTypeId: string;
  quantity: number;
  unit: string;
}
