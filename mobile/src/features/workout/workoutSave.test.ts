import { initialWorkoutState } from './workoutReducer';
import {
  acquireWorkoutSave,
  applyWorkoutEdit,
  assertExistingWorkoutUpdated,
  finalizeWorkoutSave,
  releaseWorkoutSave,
} from './workoutSave';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('workout save integrity', () => {
  it('admits only one save until the synchronous lock is released', () => {
    const lock = { current: false };

    expect(acquireWorkoutSave(lock)).toBe(true);
    expect(acquireWorkoutSave(lock)).toBe(false);
    releaseWorkoutSave(lock);
    expect(acquireWorkoutSave(lock)).toBe(true);
  });

  it('records a user edit and its next state synchronously', () => {
    const next = applyWorkoutEdit(
      { generation: 3, state: initialWorkoutState },
      { type: 'SET_TITLE', payload: 'Latest title' },
    );

    expect(next.generation).toBe(4);
    expect(next.state.title).toBe('Latest title');
    expect(next.state.isDirty).toBe(true);
  });

  it('keeps a user-initiated plan-day switch dirty even though initial seeding is clean', () => {
    const next = applyWorkoutEdit(
      { generation: 1, state: initialWorkoutState },
      {
        type: 'LOAD_DEFAULT_PLAN',
        payload: {
          day: 2,
          title: 'Day 2',
          exercises: [{ name: 'Squat', sets: [{ reps: '', weight: '', rpe: '' }] }],
        },
      },
    );

    expect(next.generation).toBe(2);
    expect(next.state.selectedDay).toBe(2);
    expect(next.state.isDirty).toBe(true);
  });

  it('keeps and repersists an edit that arrives while draft clearing is pending', async () => {
    let generation = 7;
    const clear = deferred();
    const repersistLatestDraft = jest.fn(async () => undefined);

    const finalizing = finalizeWorkoutSave({
      savedGeneration: 7,
      getCurrentGeneration: () => generation,
      clearDraft: () => clear.promise,
      repersistLatestDraft,
    });
    generation = 8;
    clear.resolve();

    await expect(finalizing).resolves.toBe('edited');
    expect(repersistLatestDraft).toHaveBeenCalledTimes(1);
  });

  it('does not clear when an edit already follows the submitted snapshot', async () => {
    const clearDraft = jest.fn(async () => undefined);
    const repersistLatestDraft = jest.fn(async () => undefined);

    await expect(
      finalizeWorkoutSave({
        savedGeneration: 2,
        getCurrentGeneration: () => 3,
        clearDraft,
        repersistLatestDraft,
      }),
    ).resolves.toBe('edited');
    expect(clearDraft).not.toHaveBeenCalled();
    expect(repersistLatestDraft).toHaveBeenCalledTimes(1);
  });

  it('clears and finalizes when the submitted snapshot is still current', async () => {
    const clearDraft = jest.fn(async () => undefined);
    const repersistLatestDraft = jest.fn(async () => undefined);

    await expect(
      finalizeWorkoutSave({
        savedGeneration: 4,
        getCurrentGeneration: () => 4,
        clearDraft,
        repersistLatestDraft,
      }),
    ).resolves.toBe('finalized');
    expect(clearDraft).toHaveBeenCalledTimes(1);
    expect(repersistLatestDraft).not.toHaveBeenCalled();
  });

  it('rejects an error-free existing-log update that affected no row', () => {
    expect(() =>
      assertExistingWorkoutUpdated({ data: null, error: null }, 'log-7'),
    ).toThrow('Workout update affected no row');
  });

  it('accepts only the requested existing-log id', () => {
    expect(() =>
      assertExistingWorkoutUpdated({ data: { id: 'log-7' }, error: null }, 'log-7'),
    ).not.toThrow();
    expect(() =>
      assertExistingWorkoutUpdated({ data: { id: 'log-other' }, error: null }, 'log-7'),
    ).toThrow('Workout update affected no row');
  });
});
