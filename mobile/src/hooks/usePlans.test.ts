import { normalizeExercisesForTest } from './usePlans';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {},
}));

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
});
