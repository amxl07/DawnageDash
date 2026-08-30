import { fetchMealPlan, normalizeExercisesForTest } from './usePlans';

const mockFrom = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

type QueryChain = {
  select: jest.Mock;
  eq: jest.Mock;
  then: (resolve: (value: { data: unknown; error: unknown }) => unknown) => Promise<unknown>;
};

const queryResult = (result: { data: unknown; error: unknown }) => {
  const chain = {} as QueryChain;
  chain.select = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.then = (resolve) => Promise.resolve(result).then(resolve);
  return chain;
};

type TemplateChain = {
  select: jest.Mock;
  is: jest.Mock;
  eq: jest.Mock;
  maybeSingle: jest.Mock;
};

const templateResult = (result: { data: unknown; error: unknown }) => {
  const chain = {} as TemplateChain;
  chain.select = jest.fn(() => chain);
  chain.is = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.maybeSingle = jest.fn(async () => result);
  return chain;
};

describe('normalizeExercisesForTest', () => {
  it('retains optional duration, rest, warmup, and substitution metadata', () => {
    expect(
      normalizeExercisesForTest(
        JSON.stringify([
          {
            Exercise: 'Row',
            Sets: 4,
            Duration: '45 sec',
            Rest: 90,
            warmup_sets: 1,
            substitutions: [{ name: 'Chest-supported row', sets: 4, reps: '10' }],
          },
        ]),
      )[0],
    ).toMatchObject({
      name: 'Row',
      duration: '45 sec',
      restSeconds: 90,
      warmupSets: 1,
      substitutions: [{ name: 'Chest-supported row' }],
    });
  });

  it('does not invent substitutions when source metadata has none', () => {
    expect(
      normalizeExercisesForTest('[{"Exercise":"Squat","Sets":3}]')[0].substitutions,
    ).toEqual([]);
  });

  it('normalizes lower-case legacy metadata and clamps warmups to the set count', () => {
    expect(
      normalizeExercisesForTest(
        JSON.stringify([
          {
            exercise: 'Carry',
            sets: 2,
            duration: '30 seconds',
            rest_seconds: 60,
            warmupSets: 7,
            substitutions: [{ Exercise: 'Suitcase carry', Duration: '20 seconds' }],
          },
        ]),
      )[0],
    ).toMatchObject({
      name: 'Carry',
      duration: '30 seconds',
      restSeconds: 60,
      warmupSets: 2,
      substitutions: [{ name: 'Suitcase carry', duration: '20 seconds' }],
    });
  });

  it('keeps only substitutions supplied as objects with non-empty names', () => {
    expect(
      normalizeExercisesForTest(
        JSON.stringify([
          {
            Exercise: 'Squat',
            Sets: 3,
            warmup_sets: -2,
            substitutions: [
              'Lunge',
              null,
              {},
              { name: '  ' },
              { name: 42 },
              { name: 'Split squat' },
            ],
          },
        ]),
      )[0],
    ).toMatchObject({
      warmupSets: 0,
      substitutions: [{ name: 'Split squat' }],
    });
  });

  it('uses the first non-empty name, exercise, or Exercise string consistently', () => {
    const normalized = normalizeExercisesForTest(
      JSON.stringify([
        {
          name: 'Preferred name',
          exercise: 'Lower alias',
          Exercise: 'Upper alias',
          Sets: 2,
          substitutions: [
            { name: '  ', exercise: 'Preferred substitution', Exercise: 'Fallback substitution' },
          ],
        },
        {
          name: '',
          exercise: '  ',
          Exercise: 'Upper fallback',
          Sets: 1,
        },
      ]),
    );

    expect(normalized.map((exercise) => exercise.name)).toEqual([
      'Preferred name',
      'Upper fallback',
    ]);
    expect(normalized[0].substitutions[0].name).toBe('Preferred substitution');
  });
});

describe('meal-plan errors', () => {
  beforeEach(() => mockFrom.mockReset());

  it('propagates the user meal-plan query error', async () => {
    const failure = new Error('user meals unavailable');
    mockFrom.mockReturnValue(queryResult({ data: null, error: failure }));

    await expect(
      fetchMealPlan('user-1', { calories: 2200, dietType: 'vegetarian' }),
    ).rejects.toBe(failure);
  });

  it('propagates the fallback template query error', async () => {
    const failure = new Error('template unavailable');
    mockFrom.mockImplementation((table: string) =>
      table === 'meal_plans'
        ? queryResult({ data: [], error: null })
        : templateResult({ data: null, error: failure }),
    );

    await expect(
      fetchMealPlan('user-1', { calories: 2200, dietType: 'vegetarian' }),
    ).rejects.toBe(failure);
  });
});
