import type { FitnessRepository } from '@/data/fitness-repository';
import type {
  AddFoodEntryInput,
  DailyMeal,
  DailySummary,
  Food,
  FoodEntry,
  FoodSearchResult,
  MealType,
} from '@/domain/models';

const mealTypes: MealType[] = [
  { id: 'breakfast', name: 'Breakfast' },
  { id: 'lunch', name: 'Lunch' },
  { id: 'dinner', name: 'Dinner' },
  { id: 'snacks', name: 'Snacks' },
];

const foods: Food[] = [
  {
    id: 'demo-oats',
    variantId: 'demo-oats-default',
    name: 'Steel cut oats',
    servingSize: 100,
    servingUnit: 'g',
    nutrition: { calories: 380, carbohydrates: 68, fat: 7, protein: 13 },
  },
  {
    id: 'demo-yogurt',
    variantId: 'demo-yogurt-default',
    name: 'Greek yogurt',
    servingSize: 170,
    servingUnit: 'g',
    nutrition: { calories: 150, carbohydrates: 5, fat: 4, protein: 18 },
  },
  {
    id: 'demo-salmon',
    variantId: 'demo-salmon-default',
    name: 'Roasted salmon',
    servingSize: 140,
    servingUnit: 'g',
    nutrition: { calories: 290, carbohydrates: 0, fat: 17, protein: 31 },
  },
];

const initialEntries: FoodEntry[] = [
  {
    calories: 150,
    carbohydrates: 5,
    fat: 4,
    foodId: 'demo-yogurt',
    foodName: 'Greek yogurt',
    id: 'demo-entry-1',
    mealTypeId: 'breakfast',
    protein: 18,
    quantity: 1,
    unit: 'serving',
  },
  {
    calories: 290,
    carbohydrates: 0,
    fat: 17,
    foodId: 'demo-salmon',
    foodName: 'Roasted salmon',
    id: 'demo-entry-2',
    mealTypeId: 'dinner',
    protein: 31,
    quantity: 1,
    unit: 'serving',
  },
];

function cloneEntry(entry: FoodEntry): FoodEntry {
  return { ...entry };
}

function roundNutrition(value: number): number {
  return Math.round(value * 100) / 100;
}

export function createDemoFitnessRepository(): FitnessRepository {
  const entriesByDate = new Map<string, FoodEntry[]>();
  let nextEntryId = 3;

  function entriesFor(date: string): FoodEntry[] {
    const existing = entriesByDate.get(date);
    if (existing) {
      return existing;
    }

    const entries = initialEntries.map(cloneEntry);
    entriesByDate.set(date, entries);
    return entries;
  }

  function buildSummary(date: string): DailySummary {
    const entries = entriesFor(date);
    const meals: DailyMeal[] = mealTypes.map((mealType) => ({
      entries: entries
        .filter((entry) => entry.mealTypeId === mealType.id)
        .map(cloneEntry),
      mealTypeId: mealType.id,
      name: mealType.name,
    }));
    const total = entries.reduce(
      (nutrition, entry) => ({
        calories: nutrition.calories + entry.calories,
        carbohydrates: nutrition.carbohydrates + entry.carbohydrates,
        fat: nutrition.fat + entry.fat,
        protein: nutrition.protein + entry.protein,
      }),
      { calories: 0, carbohydrates: 0, fat: 0, protein: 0 },
    );

    return {
      calories: { consumed: total.calories, goal: 2200 },
      date,
      macros: {
        carbohydrates: total.carbohydrates,
        fat: total.fat,
        protein: total.protein,
      },
      meals,
    };
  }

  return {
    async getDailySummary(date) {
      return buildSummary(date);
    },
    async searchFoods(term): Promise<FoodSearchResult> {
      const normalizedTerm = term.trim().toLocaleLowerCase();
      const items = foods.filter((food) =>
        food.name.toLocaleLowerCase().includes(normalizedTerm),
      );

      return { items: items.map((food) => ({ ...food, nutrition: { ...food.nutrition } })), total: items.length };
    },
    async getMealTypes() {
      return mealTypes.map((mealType) => ({ ...mealType }));
    },
    async addFoodEntry(input: AddFoodEntryInput) {
      const food = foods.find((candidate) => candidate.id === input.foodId);
      if (!food) {
        throw new Error('Choose a food before adding it.');
      }

      if (food.variantId !== input.variantId) {
        throw new Error('Choose a food serving before adding it.');
      }

      if (!mealTypes.some((mealType) => mealType.id === input.mealTypeId)) {
        throw new Error('Choose a meal before adding a food.');
      }

      if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
        throw new Error('Enter a quantity greater than zero.');
      }

      if (!input.unit.trim()) {
        throw new Error('Choose a unit before adding a food.');
      }

      const entry: FoodEntry = {
        calories: roundNutrition(food.nutrition.calories * input.quantity),
        carbohydrates: roundNutrition(food.nutrition.carbohydrates * input.quantity),
        fat: roundNutrition(food.nutrition.fat * input.quantity),
        foodId: food.id,
        foodName: food.name,
        id: `demo-entry-${nextEntryId++}`,
        mealTypeId: input.mealTypeId,
        protein: roundNutrition(food.nutrition.protein * input.quantity),
        quantity: input.quantity,
        unit: input.unit,
      };
      entriesFor(input.date).push(entry);

      return cloneEntry(entry);
    },
  };
}
