import { fireEvent, render } from '@testing-library/react-native';

import { MealSection } from '@/features/diary/meal-section';

describe('MealSection', () => {
  it('renders each logged entry with its nutrition summary', async () => {
    const screen = await render(
      <MealSection
        meal={{
          entries: [{
            calories: 150,
            carbohydrates: 5,
            fat: 4,
            foodId: 'yogurt',
            foodName: 'Greek yogurt',
            id: 'entry-1',
            mealTypeId: 'breakfast',
            protein: 18,
            quantity: 1,
            unit: 'serving',
          }],
          mealTypeId: 'breakfast',
          name: 'Breakfast',
        }}
      />,
    );

    expect(screen.getByRole('header', { name: 'Breakfast' })).toBeTruthy();
    expect(screen.getByText('Greek yogurt')).toBeTruthy();
    expect(screen.getByText('150 kcal · P 18g · C 5g · F 4g')).toBeTruthy();
  });

  it('turns an empty meal into an accessible add-food action', async () => {
    const onAddFood = jest.fn();
    const screen = await render(
      <MealSection
        meal={{ entries: [], mealTypeId: 'lunch', name: 'Lunch' }}
        onAddFood={onAddFood}
      />,
    );

    expect(screen.getByText('Nothing logged yet.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Add food to Lunch' }));
    expect(onAddFood).toHaveBeenCalledTimes(1);
  });
});
