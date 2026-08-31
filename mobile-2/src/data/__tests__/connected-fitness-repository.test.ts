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

function dailySummaryWire(overrides: Record<string, unknown> = {}) {
  return {
    adjustedGoals: { calories: 2150 },
    calorieBalance: { eaten: 640 },
    exerciseSessions: [],
    foodEntries: [
      {
        calories: 120,
        carbs: 12,
        fat: 3,
        food_id: 'food-1',
        food_name: 'Yogurt bowl',
        id: 'entry-1',
        meal_type: 'Breakfast',
        meal_type_id: 'breakfast',
        protein: 10,
        quantity: 85,
        serving_size: 170,
        unit: 'g',
      },
    ],
    goals: { calories: 2200 },
    stepCalories: 0,
    supplementTotals: {},
    waterIntake: 0,
    ...overrides,
  };
}

describe('connected fitness repository', () => {
  it('maps the daily-summary wire payload, groups scaled entries, and keeps reported calories', async () => {
    const fetchImpl = jest.fn(async () => jsonResponse(dailySummaryWire()));
    const repository = createConnectedFitnessRepository(session, fetchImpl);

    await expect(repository.getDailySummary('2026-09-01')).resolves.toEqual({
      calories: { consumed: 640, goal: 2150 },
      date: '2026-09-01',
      macros: { carbohydrates: 6, fat: 1.5, protein: 5 },
      meals: [
        {
          entries: [
            {
              calories: 60,
              carbohydrates: 6,
              fat: 1.5,
              foodId: 'food-1',
              foodName: 'Yogurt bowl',
              id: 'entry-1',
              mealTypeId: 'breakfast',
              protein: 5,
              quantity: 85,
              unit: 'g',
            },
          ],
          mealTypeId: 'breakfast',
          name: 'Breakfast',
        },
      ],
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

  it('falls back to scaled food-entry calories when the server omits calorieBalance.eaten', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse(dailySummaryWire({ calorieBalance: {} })),
    );
    const repository = createConnectedFitnessRepository(session, fetchImpl);

    await expect(repository.getDailySummary('2026-09-01')).resolves.toMatchObject({
      calories: { consumed: 60, goal: 2150 },
    });
  });

  it('rejects an invalid daily-summary wire response before it reaches consumers', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse({ ...dailySummaryWire(), foodEntries: 'not-an-array' }),
    );
    const repository = createConnectedFitnessRepository(session, fetchImpl);

    await expect(repository.getDailySummary('2026-09-01')).rejects.toMatchObject({
      kind: 'data-format',
      status: 200,
    });
  });

  it('searches with compatible pagination parameters and maps the default variant', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse({
        foods: [
          {
            brand: 'Dawnage Dairy',
            default_variant: {
              calories: 150,
              carbs: 5,
              fat: 4,
              id: 'variant-1',
              protein: 18,
              serving_size: 170,
              serving_unit: 'g',
            },
            id: 'food-1',
            name: 'Greek yogurt',
          },
        ],
        totalCount: 1,
      }),
    );
    const repository = createConnectedFitnessRepository(session, fetchImpl);

    await expect(repository.searchFoods('greek yogurt')).resolves.toEqual({
      items: [
        {
          brand: 'Dawnage Dairy',
          id: 'food-1',
          name: 'Greek yogurt',
          nutrition: { calories: 150, carbohydrates: 5, fat: 4, protein: 18 },
          servingSize: 170,
          servingUnit: 'g',
          variantId: 'variant-1',
        },
      ],
      total: 1,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://fitness.example/api/foods/foods-paginated?searchTerm=greek+yogurt&currentPage=1&itemsPerPage=20&sortBy=name%3Aasc',
      expect.any(Object),
    );
  });

  it('loads meal types from the compatible meal-types endpoint', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse([{ extra_server_field: true, id: 'breakfast', name: 'Breakfast' }]),
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

  it('posts compatible snake-case food-entry data and maps the response', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse({
        calories: 150,
        carbs: 5,
        fat: 4,
        food_id: 'food-1',
        food_name: 'Greek yogurt',
        id: 'entry-2',
        meal_type_id: 'breakfast',
        protein: 18,
        quantity: 1,
        serving_size: 1,
        unit: 'serving',
        variant_id: 'variant-1',
      }),
    );
    const repository = createConnectedFitnessRepository(session, fetchImpl);

    await expect(
      repository.addFoodEntry({
        date: '2026-09-01',
        foodId: 'food-1',
        mealTypeId: 'breakfast',
        quantity: 1,
        unit: 'serving',
        variantId: 'variant-1',
      }),
    ).resolves.toEqual({
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
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://fitness.example/api/food-entries/',
      expect.objectContaining({
        body: JSON.stringify({
          entry_date: '2026-09-01',
          food_id: 'food-1',
          meal_type_id: 'breakfast',
          quantity: 1,
          unit: 'serving',
          variant_id: 'variant-1',
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
