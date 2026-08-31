import type { Food } from '@/domain/models';

export function getInitialFoodQuantity(food: Food): string {
  return String(food.servingSize);
}
