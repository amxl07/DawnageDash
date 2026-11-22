import type { Food } from '@/domain/models';
import {
  getInitialFoodQuantity,
  shouldClearFoodSelection,
} from '@/features/food/food-selection';

describe('getInitialFoodQuantity', () => {
  it('uses the selected food serving size in its serving unit', () => {
    const food: Food = {
      id: 'greek-yogurt',
      name: 'Greek yogurt',
      nutrition: { calories: 150, carbohydrates: 5, fat: 4, protein: 18 },
      servingSize: 170,
      servingUnit: 'g',
      variantId: 'greek-yogurt-default',
    };

    expect(getInitialFoodQuantity(food)).toBe('170');
  });

  it('clears a selected food when the search term changes or is cleared', () => {
    expect(shouldClearFoodSelection('oats', 'salmon')).toBe(true);
    expect(shouldClearFoodSelection('oats', '')).toBe(true);
    expect(shouldClearFoodSelection(' oats ', 'oats')).toBe(false);
  });
});
