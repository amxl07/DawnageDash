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
    adjustedGoals: { calories: 2150, protein: 150, carbs: 250, fat: 65 },
    calorieBalance: { eaten: 640 },
    exerciseSessions: [],
    foodEntries: [
      {
        calories: 120,
        carbs: 12,
        entry_date: '2026-09-01',
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
    goals: { calories: 2200, protein: 140, carbs: 240, fat: 70 },
    stepCalories: 0,
    supplementTotals: { calories: 40, protein: 3, carbs: 2, fat: 1 },
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
      macroGoals: { carbohydrates: 250, fat: 65, protein: 150 },
      macros: { carbohydrates: 8, fat: 2.5, protein: 8 },
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
      calories: { consumed: 100, goal: 2150 },
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

  it('maps nullable daily entry fields to safe values and identity fallbacks', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse(
        dailySummaryWire({
          calorieBalance: {},
          foodEntries: [
            {
              calories: null,
              carbs: null,
              entry_date: '2026-09-01',
              fat: null,
              food_id: null,
              food_name: null,
              id: 'entry-null-meal',
              meal_id: 'meal-7',
              meal_type: 'Breakfast',
              meal_type_id: 'breakfast',
              protein: null,
              quantity: 1,
              serving_size: null,
              unit: null,
              variant_id: null,
            },
            {
              entry_date: '2026-09-01',
              id: 'entry-null-id',
              meal_type: 'Breakfast',
              meal_type_id: 'breakfast',
              quantity: 1,
            },
          ],
          supplementTotals: {},
        }),
      ),
    );
    const repository = createConnectedFitnessRepository(session, fetchImpl);

    await expect(repository.getDailySummary('2026-09-01')).resolves.toMatchObject({
      calories: { consumed: 0, goal: 2150 },
      macroGoals: { carbohydrates: 250, fat: 65, protein: 150 },
      macros: { carbohydrates: 0, fat: 0, protein: 0 },
      meals: [
        {
          entries: [
            expect.objectContaining({
              foodId: 'meal-7',
              foodName: 'Meal',
              id: 'entry-null-meal',
              unit: 'serving',
            }),
            expect.objectContaining({
              foodId: 'entry-null-id',
              foodName: 'Meal',
              id: 'entry-null-id',
              unit: 'serving',
            }),
          ],
        },
      ],
    });
  });

  it('uses base macro goals when adjusted goals are absent and adds supplement macros', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse(
        dailySummaryWire({
          adjustedGoals: null,
          calorieBalance: {},
          goals: { calories: 2300, protein: 130, carbs: 260, fat: 75 },
          supplementTotals: { calories: 20, protein: 4, carbs: 6, fat: 2 },
        }),
      ),
    );
    const repository = createConnectedFitnessRepository(session, fetchImpl);

    await expect(repository.getDailySummary('2026-09-01')).resolves.toMatchObject({
      calories: { consumed: 80, goal: 2300 },
      macroGoals: { carbohydrates: 260, fat: 75, protein: 130 },
      macros: { carbohydrates: 12, fat: 3.5, protein: 9 },
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

  it('omits null and absent search-result brands from domain foods', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse({
        foods: [
          {
            brand: null,
            default_variant: {
              calories: 90,
              carbs: 12,
              fat: 1,
              id: 'variant-null-brand',
              protein: 3,
              serving_size: 100,
              serving_unit: 'g',
            },
            id: 'food-null-brand',
            name: 'Banana',
          },
          {
            default_variant: {
              calories: 50,
              carbs: 6,
              fat: 2,
              id: 'variant-absent-brand',
              protein: 4,
              serving_size: 100,
              serving_unit: 'g',
            },
            id: 'food-absent-brand',
            name: 'Tofu',
          },
        ],
        totalCount: 2,
      }),
    );
    const repository = createConnectedFitnessRepository(session, fetchImpl);

    await expect(repository.searchFoods('')).resolves.toEqual({
      items: [
        {
          id: 'food-null-brand',
          name: 'Banana',
          nutrition: { calories: 90, carbohydrates: 12, fat: 1, protein: 3 },
          servingSize: 100,
          servingUnit: 'g',
          variantId: 'variant-null-brand',
        },
        {
          id: 'food-absent-brand',
          name: 'Tofu',
          nutrition: { calories: 50, carbohydrates: 6, fat: 2, protein: 4 },
          servingSize: 100,
          servingUnit: 'g',
          variantId: 'variant-absent-brand',
        },
      ],
      total: 2,
    });
  });

  it('maps nullable server nutrient values in food search to zero', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse({
        foods: [
          {
            brand: null,
            default_variant: {
              calories: null,
              carbs: null,
              fat: null,
              id: 'variant-null-nutrition',
              protein: null,
              serving_size: 1,
              serving_unit: 'serving',
            },
            id: 'food-null-nutrition',
            name: 'Server food',
          },
        ],
        totalCount: 1,
      }),
    );
    const repository = createConnectedFitnessRepository(session, fetchImpl);

    await expect(repository.searchFoods('server')).resolves.toEqual({
      items: [
        expect.objectContaining({
          id: 'food-null-nutrition',
          nutrition: { calories: 0, carbohydrates: 0, fat: 0, protein: 0 },
        }),
      ],
      total: 1,
    });
  });

  it('loads meal types from the compatible meal-types endpoint', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse([
        {
          extra_server_field: true,
          id: 'breakfast',
          is_visible: true,
          name: 'Breakfast',
          show_in_quick_log: null,
        },
        {
          id: 'late-night',
          is_visible: false,
          name: 'Late night',
          show_in_quick_log: false,
        },
      ]),
    );
    const repository = createConnectedFitnessRepository(session, fetchImpl);

    await expect(repository.getMealTypes()).resolves.toEqual([
      {
        id: 'breakfast',
        isVisible: true,
        name: 'Breakfast',
        showInQuickLog: true,
      },
      {
        id: 'late-night',
        isVisible: false,
        name: 'Late night',
        showInQuickLog: false,
      },
    ]);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://fitness.example/api/meal-types',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer session-token' }),
      }),
    );
  });

  it('accepts the raw food_entries row returned after a successful create', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse({
        calories: 150,
        carbs: 5,
        entry_date: '2026-09-01',
        fat: 4,
        food_id: 'food-1',
        food_name: 'Greek yogurt',
        id: 'entry-2',
        meal_type_id: 'breakfast',
        protein: 18,
        quantity: 1,
        serving_size: 1,
        unit: 'serving',
        user_id: 'user-123',
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

  it('maps nullable add-entry response fields to safe values', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse({
        calories: null,
        carbs: null,
        entry_date: '2026-09-01',
        fat: null,
        food_id: null,
        food_name: null,
        id: 'entry-created-null',
        meal_id: 'meal-created-4',
        meal_type_id: 'lunch',
        protein: null,
        quantity: 2,
        serving_size: null,
        unit: null,
        variant_id: null,
      }),
    );
    const repository = createConnectedFitnessRepository(session, fetchImpl);

    await expect(
      repository.addFoodEntry({
        date: '2026-09-01',
        foodId: 'food-1',
        mealTypeId: 'lunch',
        quantity: 2,
        unit: 'serving',
        variantId: 'variant-1',
      }),
    ).resolves.toEqual({
      calories: 0,
      carbohydrates: 0,
      fat: 0,
      foodId: 'meal-created-4',
      foodName: 'Meal',
      id: 'entry-created-null',
      mealTypeId: 'lunch',
      protein: 0,
      quantity: 2,
      unit: 'serving',
    });
  });
});
