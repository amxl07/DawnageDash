import type { Food } from '@/domain/models';

export function getInitialFoodQuantity(food: Food): string {
  return String(food.servingSize);
}

export function shouldClearFoodSelection(previousTerm: string, nextTerm: string): boolean {
  return previousTerm.trim() !== nextTerm.trim();
}
