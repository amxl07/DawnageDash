import {
  persistWorkoutLog,
  type WorkoutLogPersistence,
  type WorkoutLogPayload,
} from './workoutPersistence';
import { classifyDeliveryFailure } from './delivery-errors';

jest.mock('./supabase', () => ({ supabase: {} }));

const first: WorkoutLogPayload = {
  user_id: 'user-1',
  date: '2026-08-30',
  title: 'First version',
  content: '{"version":2,"exercises":[]}',
};

function result(id: string | null) {
  return Promise.resolve({ data: id ? { id } : null, error: null });
}

describe('persistWorkoutLog', () => {
  it('reuses the inserted same-date row on a later save instead of inserting twice', async () => {
    let storedId: string | null = null;
    const persistence: WorkoutLogPersistence = {
      findAllByDate: jest.fn(async () => ({ data: storedId ? [{ id: storedId }] : [], error: null })),
      updateById: jest.fn(async (id) => result(id)),
      insert: jest.fn(async () => {
        storedId = 'created-1';
        return result(storedId);
      }),
    };

    await expect(persistWorkoutLog(first, null, persistence)).resolves.toBe('created-1');
    await expect(
      persistWorkoutLog({ ...first, title: 'Edited version' }, null, persistence),
    ).resolves.toBe('created-1');

    expect(persistence.insert).toHaveBeenCalledTimes(1);
    expect(persistence.updateById).toHaveBeenCalledTimes(1);
    expect(persistence.updateById).toHaveBeenCalledWith(
      'created-1',
      expect.objectContaining({ title: 'Edited version' }),
    );
  });

  it('refuses a missing explicit id without falling through to insert or another row', async () => {
    const persistence: WorkoutLogPersistence = {
      findAllByDate: jest.fn(async () => ({ data: [{ id: 'other' }], error: null })),
      updateById: jest.fn(async () => result(null)),
      insert: jest.fn(async () => result('replacement')),
    };
    await expect(persistWorkoutLog(first, 'missing', persistence)).rejects.toThrow('Workout is missing or no longer editable');
    expect(persistence.findAllByDate).not.toHaveBeenCalled();
    expect(persistence.insert).not.toHaveBeenCalled();
  });
  it('requires selection instead of overwriting an arbitrary same-date row', async () => {
    const persistence: WorkoutLogPersistence = {
      findAllByDate: jest.fn(async () => ({ data: [{ id: 'a' }, { id: 'b' }], error: null })),
      updateById: jest.fn(async () => result('a')),
      insert: jest.fn(async () => result('replacement')),
    };
    await expect(persistWorkoutLog(first, null, persistence)).rejects.toMatchObject({ status: 409 });
    expect(persistence.updateById).not.toHaveBeenCalled();
    expect(persistence.insert).not.toHaveBeenCalled();
  });

  it('rejects an insert that returns no affected row id', async () => {
    const persistence: WorkoutLogPersistence = {
      findAllByDate: jest.fn(async () => ({ data: [], error: null })),
      updateById: jest.fn(async () => result(null)),
      insert: jest.fn(async () => result(null)),
    };

    await expect(persistWorkoutLog(first, null, persistence)).rejects.toThrow(
      'Workout insert affected no row',
    );
  });

  it('preserves the outer SDK status when an error body has no provider code', async () => {
    const persistence: WorkoutLogPersistence = {
      findAllByDate: jest.fn(async () => ({
        data: null,
        error: { message: 'private upstream response', code: '' },
        status: 503,
      })),
      updateById: jest.fn(async () => result(null)),
      insert: jest.fn(async () => result(null)),
    };

    const thrown = await persistWorkoutLog(first, null, persistence).catch((error) => error);

    expect(classifyDeliveryFailure(thrown)).toEqual({
      kind: 'temporary-server',
      retryable: true,
      code: 'http-503',
    });
  });
});
