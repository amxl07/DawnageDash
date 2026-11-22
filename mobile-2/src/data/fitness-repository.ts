import type {
  AddFoodEntryInput,
  DailySummary,
  FoodEntry,
  FoodSearchResult,
  MealType,
} from '@/domain/models';

export interface FitnessRepository {
  getDailySummary(date: string): Promise<DailySummary>;
  searchFoods(term: string): Promise<FoodSearchResult>;
  getMealTypes(): Promise<MealType[]>;
  addFoodEntry(input: AddFoodEntryInput): Promise<FoodEntry>;
}
