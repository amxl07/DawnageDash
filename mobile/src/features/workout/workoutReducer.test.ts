import {
  initialWorkoutState,
  normalizeDraftExercise,
  workoutReducer,
  type WorkoutExercise,
  type WorkoutState,
} from './workoutReducer';

const squat: WorkoutExercise = {
  id: 'squat',
  name: 'Squat',
  tracking: 'weight-reps',
  sets: [
    {
      id: 'squat-set-1',
      reps: '8',
      weight: '60',
      rpe: '7',
      duration: '',
      kind: 'work',
      completed: false,
    },
    {
      id: 'squat-set-2',
      reps: '9',
      weight: '62.5',
      rpe: '8',
      duration: '',
      kind: 'work',
      completed: false,
    },
  ],
};

const stateWithTwoSets: WorkoutState = {
  ...initialWorkoutState,
  title: 'Lower body',
  exercises: [squat],
};

describe('workoutReducer', () => {
  it('updates only the addressed set without mutating the prior state', () => {
    const next = workoutReducer(stateWithTwoSets, {
      type: 'UPDATE_SET',
      payload: { exerciseIndex: 0, setIndex: 1, field: 'reps', value: '10' },
    });

    expect(next.exercises[0].sets[0].reps).toBe('8');
    expect(next.exercises[0].sets[1].reps).toBe('10');
    expect(stateWithTwoSets.exercises[0].sets[1].reps).toBe('9');
    expect(next.exercises[0].sets[0]).toBe(stateWithTwoSets.exercises[0].sets[0]);
    expect(next.isDirty).toBe(true);
  });

  it('toggles explicit set completion without changing values', () => {
    const next = workoutReducer(stateWithTwoSets, {
      type: 'TOGGLE_SET',
      payload: { exerciseIndex: 0, setIndex: 0 },
    });

    expect(next.exercises[0].sets[0]).toMatchObject({
      reps: '8',
      weight: '60',
      rpe: '7',
      completed: true,
    });
    expect(stateWithTwoSets.exercises[0].sets[0].completed).toBe(false);
  });

  it('loads a plan day as clean and clears stale log identity', () => {
    const next = workoutReducer(
      { ...stateWithTwoSets, existingLogId: 'old-log', selectedDay: 1, isDirty: true },
      {
        type: 'LOAD_DEFAULT_PLAN',
        payload: { day: 3, title: 'Day 3 — Lower', exercises: [squat] },
      },
    );

    expect(next).toMatchObject({
      title: 'Day 3 — Lower',
      exercises: [squat],
      existingLogId: null,
      selectedDay: 3,
      isDirty: false,
    });
  });

  it('deduplicates colliding exercise IDs while loading a plan', () => {
    const next = workoutReducer(initialWorkoutState, {
      type: 'LOAD_DEFAULT_PLAN',
      payload: {
        day: 1,
        title: 'Day 1',
        exercises: [squat, { ...squat, name: 'Paused Squat' }],
      },
    });

    expect(next.exercises.map((exercise) => exercise.id)).toEqual(['squat', 'squat-1']);
  });

  it('restores an old draft with stable defaults and inferred completion', () => {
    const next = workoutReducer(initialWorkoutState, {
      type: 'RESTORE_DRAFT',
      payload: {
        title: 'Recovered workout',
        existingLogId: 'log-7',
        selectedDay: 2,
        exercises: [
          {
            id: 'bench',
            name: 'Bench Press',
            sets: [
              { reps: '5', weight: '80', rpe: '8' },
              { reps: '5', weight: '82.5', rpe: '9', completed: false },
            ],
          },
        ],
      },
    });

    expect(next.exercises[0]).toEqual({
      id: 'bench',
      name: 'Bench Press',
      tracking: 'weight-reps',
      sets: [
        {
          id: 'bench-set-1',
          reps: '5',
          weight: '80',
          rpe: '8',
          duration: '',
          kind: 'work',
          completed: true,
        },
        {
          id: 'bench-set-2',
          reps: '5',
          weight: '82.5',
          rpe: '9',
          duration: '',
          kind: 'work',
          completed: false,
        },
      ],
    });
    expect(next).toMatchObject({ existingLogId: 'log-7', selectedDay: 2, isDirty: true });
  });

  it('normalizes missing exercise and duplicate set IDs deterministically', () => {
    const normalized = normalizeDraftExercise(
      {
        name: 'Row',
        tracking: 'duration',
        sets: [
          { id: 'repeated', reps: '', weight: '', rpe: '', duration: '30', kind: 'warmup' },
          { id: 'repeated', reps: '', weight: '', rpe: '' },
        ],
      },
      4,
    );

    expect(normalized.id).toBe('exercise-5');
    expect(normalized.tracking).toBe('duration');
    expect(normalized.sets.map((set) => set.id)).toEqual(['repeated', 'exercise-5-set-2']);
  });

  it('adds a set with a collision-free stable ID', () => {
    const state: WorkoutState = {
      ...stateWithTwoSets,
      exercises: [
        {
          ...squat,
          sets: [
            squat.sets[0],
            { ...squat.sets[1], id: 'squat-set-3' },
          ],
        },
      ],
    };

    const next = workoutReducer(state, { type: 'ADD_SET', payload: { exerciseIndex: 0 } });

    expect(next.exercises[0].sets).toHaveLength(3);
    expect(next.exercises[0].sets[2]).toEqual({
      id: 'squat-set-2',
      reps: '',
      weight: '',
      rpe: '',
      duration: '',
      kind: 'work',
      completed: false,
    });
    expect(state.exercises[0].sets).toHaveLength(2);
    expect(next.isDirty).toBe(true);
  });

  it('removes only the addressed set', () => {
    const next = workoutReducer(stateWithTwoSets, {
      type: 'REMOVE_SET',
      payload: { exerciseIndex: 0, setIndex: 0 },
    });

    expect(next.exercises[0].sets.map((set) => set.id)).toEqual(['squat-set-2']);
    expect(stateWithTwoSets.exercises[0].sets).toHaveLength(2);
    expect(next.isDirty).toBe(true);
  });

  it('adds an exercise without colliding with an existing generated ID', () => {
    const state: WorkoutState = {
      ...initialWorkoutState,
      exercises: [{ ...squat, id: 'custom-1' }],
    };

    const next = workoutReducer(state, {
      type: 'ADD_EXERCISE',
      payload: { name: 'Cable Fly' },
    });

    expect(next.exercises[1]).toEqual({
      id: 'custom-2',
      name: 'Cable Fly',
      tracking: 'weight-reps',
      sets: [
        {
          id: 'custom-2-set-1',
          reps: '',
          weight: '',
          rpe: '',
          duration: '',
          kind: 'work',
          completed: false,
        },
      ],
    });
    expect(next.isDirty).toBe(true);
  });

  it('replaces one exercise with normalized data', () => {
    const next = workoutReducer(stateWithTwoSets, {
      type: 'REPLACE_EXERCISE',
      payload: {
        exerciseIndex: 0,
        exercise: { id: 'row', name: 'Chest-Supported Row', sets: [{ reps: '', weight: '', rpe: '' }] },
      },
    });

    expect(next.exercises).toEqual([
      {
        id: 'row',
        name: 'Chest-Supported Row',
        tracking: 'weight-reps',
        sets: [
          {
            id: 'row-set-1',
            reps: '',
            weight: '',
            rpe: '',
            duration: '',
            kind: 'work',
            completed: false,
          },
        ],
      },
    ]);
    expect(next.isDirty).toBe(true);
  });

  it('avoids an exercise ID collision when replacing', () => {
    const state: WorkoutState = {
      ...stateWithTwoSets,
      exercises: [squat, { ...squat, id: 'row', name: 'Row' }],
    };

    const next = workoutReducer(state, {
      type: 'REPLACE_EXERCISE',
      payload: {
        exerciseIndex: 1,
        exercise: { id: 'squat', name: 'Front Squat', sets: [{ reps: '', weight: '', rpe: '' }] },
      },
    });

    expect(next.exercises.map((exercise) => exercise.id)).toEqual(['squat', 'squat-1']);
  });

  it('loads existing-log identity and selected day as clean state', () => {
    const next = workoutReducer(
      { ...stateWithTwoSets, existingLogId: 'stale', selectedDay: 4, isDirty: true },
      {
        type: 'LOAD_EXISTING_LOG',
        payload: { logId: 'log-9', title: 'Saved workout', exercises: [squat], selectedDay: 2 },
      },
    );

    expect(next).toMatchObject({
      existingLogId: 'log-9',
      selectedDay: 2,
      title: 'Saved workout',
      isDirty: false,
    });
  });

  it('marks an edited workout clean', () => {
    const next = workoutReducer({ ...stateWithTwoSets, isDirty: true }, { type: 'MARK_CLEAN' });

    expect(next.isDirty).toBe(false);
  });

  it('attaches a persisted row id without changing dirty state', () => {
    const dirty = { ...stateWithTwoSets, existingLogId: null, isDirty: true };
    const next = workoutReducer(dirty, {
      type: 'ATTACH_PERSISTED_LOG_ID',
      payload: 'log-created',
    });

    expect(next.existingLogId).toBe('log-created');
    expect(next.isDirty).toBe(true);
    expect(next.exercises).toBe(dirty.exercises);
  });
});
