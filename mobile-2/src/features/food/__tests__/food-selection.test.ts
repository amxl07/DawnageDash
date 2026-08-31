import type { Food } from '@/domain/models';
import { getInitialFoodQuantity } from '@/features/food/food-selection';

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
});
