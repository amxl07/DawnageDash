import { createDemoFitnessRepository } from '@/data/demo-fitness-repository';

describe('demo fitness repository', () => {
  it('returns the same deterministic meal choices from each new repository', async () => {
    const firstRepository = createDemoFitnessRepository();
    const secondRepository = createDemoFitnessRepository();

    await expect(firstRepository.getMealTypes()).resolves.toEqual([
      { id: 'breakfast', name: 'Breakfast' },
      { id: 'lunch', name: 'Lunch' },
      { id: 'dinner', name: 'Dinner' },
      { id: 'snacks', name: 'Snacks' },
    ]);
    await expect(secondRepository.getMealTypes()).resolves.toEqual([
      { id: 'breakfast', name: 'Breakfast' },
      { id: 'lunch', name: 'Lunch' },
      { id: 'dinner', name: 'Dinner' },
      { id: 'snacks', name: 'Snacks' },
    ]);
  });

  it('adds a full serving of selected food to its meal and increases that day’s calories', async () => {
    const repository = createDemoFitnessRepository();
    const before = await repository.getDailySummary('2026-09-01');
    const [oats] = (await repository.searchFoods('oats')).items;

    expect(oats).toMatchObject({ variantId: 'demo-oats-default' });

    await repository.addFoodEntry({
      date: '2026-09-01',
      foodId: oats.id,
      mealTypeId: 'lunch',
      quantity: oats.servingSize,
      unit: oats.servingUnit,
      variantId: oats.variantId,
    });

    const after = await repository.getDailySummary('2026-09-01');
    const lunch = after.meals.find((meal) => meal.mealTypeId === 'lunch');

    expect(after.calories.consumed).toBe(before.calories.consumed + 380);
    expect(lunch?.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ foodId: oats.id, foodName: 'Steel cut oats' }),
      ]),
    );
  });

  it('scales a food’s full-serving nutrition down to the entered quantity', async () => {
    const repository = createDemoFitnessRepository();
    const [oats] = (await repository.searchFoods('oats')).items;

    const entry = await repository.addFoodEntry({
      date: '2026-09-01',
      foodId: oats.id,
      mealTypeId: 'lunch',
      quantity: 1,
      unit: oats.servingUnit,
      variantId: oats.variantId,
    });

    expect(entry).toMatchObject({
      calories: 3.8,
      carbohydrates: 0.68,
      fat: 0.07,
      protein: 0.13,
      quantity: 1,
      unit: 'g',
    });
  });

  it('creates fresh deterministic state for each repository instance', async () => {
    const firstRepository = createDemoFitnessRepository();
    await firstRepository.addFoodEntry({
      date: '2026-09-01',
      foodId: 'demo-oats',
      mealTypeId: 'breakfast',
      quantity: 100,
      unit: 'g',
      variantId: 'demo-oats-default',
    });

    const secondRepository = createDemoFitnessRepository();
    const firstSummary = await firstRepository.getDailySummary('2026-09-01');
    const secondSummary = await secondRepository.getDailySummary('2026-09-01');

    expect(firstSummary.calories.consumed).toBe(secondSummary.calories.consumed + 380);
  });
});
