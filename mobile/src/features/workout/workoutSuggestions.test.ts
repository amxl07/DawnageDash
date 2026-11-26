import type { PlanExercise } from '@/hooks/usePlans';
import type { LoggedSet } from '@/lib/workout-content';

import {
  buildExerciseHistory,
  collectPlanExerciseNames,
  deriveSetSuggestion,
  normalizeExerciseName,
  parseDurationPrescription,
  parseRepetitionPrescription,
  stepNumericValue,
  suggestExerciseNames,
  type HistoricalExercise,
} from './workoutSuggestions';
import type { WorkoutExercise } from './workoutReducer';

const set = (
  setNumber: number,
  values: Partial<LoggedSet> = {},
): LoggedSet => ({
  setNumber,
  reps: '',
  weight: '',
  rpe: '',
  completed: true,
  kind: 'work',
  ...values,
});

const exercise: WorkoutExercise = {
  id: 'squat',
  name: 'Squat',
  tracking: 'weight-reps',
  sets: [
    { id: 'warmup-1', reps: '', weight: '', rpe: '', duration: '', kind: 'warmup', completed: false },
    { id: 'work-1', reps: '', weight: '', rpe: '', duration: '', kind: 'work', completed: false },
    { id: 'work-2', reps: '', weight: '', rpe: '', duration: '', kind: 'work', completed: false },
  ],
};

describe('workout suggestions', () => {
  it('normalizes lookup and search names without locale-sensitive casing', () => {
    const localeLower = jest.spyOn(String.prototype, 'toLocaleLowerCase').mockReturnValue('locale-dependent');

    expect(normalizeExerciseName('  SQUAT  ')).toBe('squat');
    expect(localeLower).not.toHaveBeenCalled();
    localeLower.mockRestore();
  });

  it('parses decimal minutes and rejects ambiguous duration prescriptions', () => {
    expect(parseDurationPrescription('1.5 min')).toBe('90');
    expect(parseDurationPrescription('45 seconds')).toBe('45');
    expect(parseDurationPrescription('30-45 sec')).toBeUndefined();
    expect(parseDurationPrescription('as long as possible')).toBeUndefined();
  });

  it('preserves entered fractional precision when stepping weight and duration', () => {
    expect(stepNumericValue({ value: '62.25', amount: 2.5, precision: 1 })).toBe('64.75');
    expect(stepNumericValue({ value: '1.5', amount: 5, precision: 0 })).toBe('6.5');
  });

  it('uses the conservative lower bound for a supported repetition range', () => {
    expect(parseRepetitionPrescription('8-12 reps')).toBe('8');
    expect(parseRepetitionPrescription('6–10')).toBe('6');
    expect(parseRepetitionPrescription('AMRAP')).toBeUndefined();
    expect(parseRepetitionPrescription('10-8')).toBeUndefined();
  });

  it('matches the same work ordinal instead of the raw array position and never copies RPE', () => {
    const history: HistoricalExercise[] = [{
      date: '2026-09-20',
      tracking: 'weight-reps',
      sets: [
        set(1, { kind: 'warmup', weight: '20', reps: '10', rpe: '4' }),
        set(2, { kind: 'work', weight: '60', reps: '10', rpe: '8' }),
        set(3, { kind: 'work', weight: '62.5', reps: '8', rpe: '9' }),
      ],
    }];

    expect(deriveSetSuggestion({ exercise, setId: 'work-2', history, targetReps: '12' })).toEqual({
      values: { weight: '62.5', reps: '8' },
      source: 'history',
      date: '2026-09-20',
    });
  });

  it('skips incompatible and incomplete history before falling back to a parseable prescription', () => {
    const history: HistoricalExercise[] = [
      { date: '2026-09-22', tracking: 'duration', sets: [set(1, { duration: '45' })] },
      { date: '2026-09-21', tracking: 'weight-reps', sets: [set(1, { kind: 'work', weight: '80', reps: '5', completed: false })] },
    ];

    expect(deriveSetSuggestion({ exercise, setId: 'work-1', history, targetReps: '8-10' })).toEqual({
      values: { reps: '8' },
      source: 'prescription',
    });
  });

  it('keeps bodyweight history blank and does not invent a prescribed weight', () => {
    const history: HistoricalExercise[] = [{
      date: '2026-09-20',
      tracking: 'weight-reps',
      sets: [set(1, { weight: '', reps: '12' })],
    }];

    expect(deriveSetSuggestion({ exercise: { ...exercise, sets: [exercise.sets[1]] }, setId: 'work-1', history, targetReps: '15' })).toEqual({
      values: { reps: '12' },
      source: 'history',
      date: '2026-09-20',
    });
    expect(deriveSetSuggestion({ exercise: { ...exercise, sets: [exercise.sets[1]] }, setId: 'work-1', targetReps: '15' })?.values).toEqual({ reps: '15' });
  });

  it('rejects malformed historical weight instead of treating it as bodyweight', () => {
    const history: HistoricalExercise[] = [{
      date: '2026-09-20', tracking: 'weight-reps',
      sets: [set(1, { weight: 'heavy', reps: '10' })],
    }];

    expect(deriveSetSuggestion({ exercise: { ...exercise, sets: [exercise.sets[1]] }, setId: 'work-1', history, targetReps: '8' })).toEqual({
      values: { reps: '8' }, source: 'prescription',
    });
  });

  it('rejects fractional historical repetitions before using a prescription fallback', () => {
    const history: HistoricalExercise[] = [{
      date: '2026-09-20', tracking: 'weight-reps',
      sets: [set(1, { weight: '60', reps: '8.5' })],
    }];

    expect(deriveSetSuggestion({ exercise: { ...exercise, sets: [exercise.sets[1]] }, setId: 'work-1', history, targetReps: '8' })).toEqual({
      values: { reps: '8' }, source: 'prescription',
    });
  });

  it('indexes recent workout names while preserving newest-first exercise history', () => {
    const result = buildExerciseHistory([
      {
        date: '2026-09-20',
        content: JSON.stringify({ version: 2, planDayNumber: null, exercises: [{ exercise: 'Squat', tracking: 'weight-reps', sets: [set(1, { weight: '70', reps: '5' })] }] }),
      },
      {
        date: '2026-09-18',
        content: JSON.stringify({ version: 2, planDayNumber: null, exercises: [{ exercise: 'SQUAT', tracking: 'weight-reps', sets: [set(1, { weight: '65', reps: '6' })] }, { exercise: 'Row', tracking: 'weight-reps', sets: [set(1, { weight: '40', reps: '10' })] }] }),
      },
    ]);

    expect(result.names).toEqual(['Squat', 'Row']);
    expect(result.byName.squat.map((entry) => entry.date)).toEqual(['2026-09-20', '2026-09-18']);
  });

  it('indexes user-entered names without prototype-key collisions', () => {
    const result = buildExerciseHistory([{ date: '2026-09-20', content: {
      version: 2, planDayNumber: null, exercises: [{ exercise: '__proto__', tracking: 'weight-reps', sets: [set(1, { reps: '5' })] }],
    } }]);

    expect(Object.getPrototypeOf(result.byName)).toBeNull();
    expect(result.byName.__proto__).toHaveLength(1);
  });

  it('collects plan substitutions and returns bounded case-insensitive deduplicated matches', () => {
    const plan = [{
      id: 'bench', name: 'Bench Press', sets: 3, reps: '8', warmupSets: 0,
      substitutions: [{ id: 'incline', name: 'Incline Press', sets: 3, reps: '8', warmupSets: 0, substitutions: [] }],
    }] satisfies PlanExercise[];

    expect(collectPlanExerciseNames([{ exercises: plan }, { exercises: [{ ...plan[0], name: 'bench press' }] }])).toEqual(['Bench Press', 'Incline Press']);
    expect(suggestExerciseNames('PRESS', ['Bench Press', 'Incline Press', 'Pressdown', 'Press up'], 3)).toEqual(['Bench Press', 'Incline Press', 'Pressdown']);
    expect(suggestExerciseNames('zzz', ['Bench Press'])).toEqual([]);
  });
});
