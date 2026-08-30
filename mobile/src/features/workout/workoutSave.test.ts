import { initialWorkoutState } from './workoutReducer';
import {
  persistWorkoutLog,
  type WorkoutLogPersistence,
  type WorkoutLogPayload,
} from '@/lib/workoutPersistence';
import {
  acquireWorkoutSave,
  applyWorkoutEdit,
  attachPersistedWorkoutId,
  finalizeWorkoutSave,
  runDraftMutationBeforeExit,
  releaseWorkoutSave,
} from './workoutSave';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('workout save integrity', () => {
  it('does not exit when a requested draft mutation is not durable', async () => {
    const exit = jest.fn();

    await expect(
      runDraftMutationBeforeExit(jest.fn(async () => false), exit),
    ).resolves.toBe(false);
    expect(exit).not.toHaveBeenCalled();
  });

  it('exits only after a requested draft mutation is confirmed', async () => {
    const events: string[] = [];

    await expect(
      runDraftMutationBeforeExit(
        async () => {
          events.push('persisted');
          return true;
        },
        () => events.push('exit'),
      ),
    ).resolves.toBe(true);
    expect(events).toEqual(['persisted', 'exit']);
  });

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

  it('flows a fresh insert id into the edited draft without advancing its generation', async () => {
    let storedId: string | null = null;
    const persistence: WorkoutLogPersistence = {
      findByDate: jest.fn(async () => ({ data: storedId ? { id: storedId } : null, error: null })),
      updateById: jest.fn(async (id) => ({ data: { id }, error: null })),
      insert: jest.fn(async () => {
        storedId = 'inserted-1';
        return { data: { id: storedId }, error: null };
      }),
    };
    const payload: WorkoutLogPayload = {
      user_id: 'user-1',
      date: '2026-08-30',
      title: 'Submitted',
      content: '{"version":2,"exercises":[]}',
    };
    let snapshot = applyWorkoutEdit(
      { generation: 0, state: initialWorkoutState },
      { type: 'SET_TITLE', payload: 'Submitted' },
    );
    const submittedGeneration = snapshot.generation;
    snapshot = applyWorkoutEdit(snapshot, { type: 'SET_TITLE', payload: 'Edited again' });
    const firstId = await persistWorkoutLog(payload, null, persistence);
    snapshot = attachPersistedWorkoutId(snapshot, firstId);
    let persistedId: string | null = null;

    await expect(
      finalizeWorkoutSave({
        savedGeneration: submittedGeneration,
        getCurrentGeneration: () => snapshot.generation,
        clearDraft: jest.fn(async () => true),
        repersistLatestDraft: async () => {
          persistedId = snapshot.state.existingLogId;
          return true;
        },
      }),
    ).resolves.toBe('edited');

    expect(snapshot.generation).toBe(2);
    expect(persistedId).toBe('inserted-1');
    await expect(
      persistWorkoutLog({ ...payload, title: 'Edited again' }, persistedId, persistence),
    ).resolves.toBe('inserted-1');
    expect(persistence.insert).toHaveBeenCalledTimes(1);
    expect(persistence.updateById).toHaveBeenCalledTimes(1);
  });

  it('keeps and repersists an edit that arrives while draft clearing is pending', async () => {
    let generation = 7;
    const clear = deferred();
    const repersistLatestDraft = jest.fn(async () => true);

    const finalizing = finalizeWorkoutSave({
      savedGeneration: 7,
      getCurrentGeneration: () => generation,
      clearDraft: async () => {
        await clear.promise;
        return true;
      },
      repersistLatestDraft,
    });
    generation = 8;
    clear.resolve();

    await expect(finalizing).resolves.toBe('edited');
    expect(repersistLatestDraft).toHaveBeenCalledTimes(1);
  });

  it('does not clear when an edit already follows the submitted snapshot', async () => {
    const clearDraft = jest.fn(async () => true);
    const repersistLatestDraft = jest.fn(async () => true);

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
    const clearDraft = jest.fn(async () => true);
    const repersistLatestDraft = jest.fn(async () => true);

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

  it('keeps the editor recoverable and republishes the latest draft when removal fails', async () => {
    const repersistLatestDraft = jest.fn(async () => true);

    await expect(
      finalizeWorkoutSave({
        savedGeneration: 4,
        getCurrentGeneration: () => 4,
        clearDraft: jest.fn(async () => false),
        repersistLatestDraft,
      }),
    ).resolves.toBe('cleanup-failed');
    expect(repersistLatestDraft).toHaveBeenCalledTimes(1);
  });

  it('surfaces failure when neither draft removal nor recovery persistence succeeds', async () => {
    await expect(
      finalizeWorkoutSave({
        savedGeneration: 4,
        getCurrentGeneration: () => 4,
        clearDraft: jest.fn(async () => false),
        repersistLatestDraft: jest.fn(async () => false),
      }),
    ).resolves.toBe('draft-persistence-failed');
  });

});
