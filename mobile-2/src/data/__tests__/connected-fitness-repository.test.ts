import { createConnectedFitnessRepository } from '@/data/connected-fitness-repository';

const session = {
  mode: 'connected' as const,
  serverUrl: 'https://fitness.example',
  token: 'session-token',
  email: 'alex@example.com',
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
  } as Response;
}

describe('connected fitness repository', () => {
  it('requests a daily summary with session and meal model headers', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse({
        calories: { consumed: 640, goal: 2200 },
        date: '2026-09-01',
        macros: { carbohydrates: 78, fat: 24, protein: 31 },
        meals: [
          {
            entries: [
              {
                calories: 640,
                carbohydrates: 78,
                fat: 24,
                foodId: 'food-1',
                foodName: 'Yogurt bowl',
                id: 'entry-1',
                mealTypeId: 'breakfast',
                protein: 31,
                quantity: 1,
                unit: 'serving',
              },
            ],
            mealTypeId: 'breakfast',
            name: 'Breakfast',
          },
        ],
      }),
    );
    const repository = createConnectedFitnessRepository(session, fetchImpl);

    await expect(repository.getDailySummary('2026-09-01')).resolves.toMatchObject({
      calories: { consumed: 640, goal: 2200 },
      date: '2026-09-01',
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://fitness.example/api/daily-summary?date=2026-09-01',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer session-token',
          'X-Meal-Model-Version': '2',
        }),
      }),
    );
  });

  it('rejects an invalid daily-summary response before it reaches consumers', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse({ date: '2026-09-01', meals: 'not-an-array' }),
    );
    const repository = createConnectedFitnessRepository(session, fetchImpl);

    await expect(repository.getDailySummary('2026-09-01')).rejects.toMatchObject({
      kind: 'data-format',
      status: 200,
    });
  });

  it('searches the paginated foods endpoint with the encoded term', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse({
        items: [
          {
            calories: 150,
            carbohydrates: 5,
            fat: 4,
            id: 'food-1',
            name: 'Greek yogurt',
            protein: 18,
            servingSize: 170,
            servingUnit: 'g',
          },
        ],
        total: 1,
      }),
    );
    const repository = createConnectedFitnessRepository(session, fetchImpl);

    await expect(repository.searchFoods('greek yogurt')).resolves.toMatchObject({
      total: 1,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://fitness.example/api/foods/foods-paginated?search=greek+yogurt',
      expect.any(Object),
    );
  });

  it('loads meal types from the compatible meal-types endpoint', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse([{ id: 'breakfast', name: 'Breakfast' }]),
    );
    const repository = createConnectedFitnessRepository(session, fetchImpl);

    await expect(repository.getMealTypes()).resolves.toEqual([
      { id: 'breakfast', name: 'Breakfast' },
    ]);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://fitness.example/api/meal-types',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer session-token' }),
      }),
    );
  });

  it('posts a food entry with the required meal model header', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse({
        calories: 150,
        carbohydrates: 5,
        fat: 4,
        foodId: 'food-1',
        foodName: 'Greek yogurt',
        id: 'entry-2',
        mealTypeId: 'breakfast',
        protein: 18,
        quantity: 1,
        unit: 'serving',
      }),
    );
    const repository = createConnectedFitnessRepository(session, fetchImpl);

    await expect(
      repository.addFoodEntry({
        date: '2026-09-01',
        foodId: 'food-1',
        mealTypeId: 'breakfast',
        quantity: 1,
      }),
    ).resolves.toMatchObject({ id: 'entry-2', foodName: 'Greek yogurt' });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://fitness.example/api/food-entries/',
      expect.objectContaining({
        body: JSON.stringify({
          date: '2026-09-01',
          foodId: 'food-1',
          mealTypeId: 'breakfast',
          quantity: 1,
        }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Meal-Model-Version': '2',
        }),
        method: 'POST',
      }),
    );
  });
});
