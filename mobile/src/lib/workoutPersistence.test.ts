import {
  persistWorkoutLog,
  type WorkoutLogPersistence,
  type WorkoutLogPayload,
} from './workoutPersistence';

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
      findByDate: jest.fn(async () => ({ data: storedId ? { id: storedId } : null, error: null })),
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

  it('recovers a stale requested id through one same-date lookup and insert', async () => {
    const persistence: WorkoutLogPersistence = {
      findByDate: jest.fn(async () => result(null)),
      updateById: jest.fn(async () => result(null)),
      insert: jest.fn(async () => result('replacement-1')),
    };

    await expect(persistWorkoutLog(first, 'stale-id', persistence)).resolves.toBe(
      'replacement-1',
    );
    expect(persistence.updateById).toHaveBeenCalledTimes(1);
    expect(persistence.findByDate).toHaveBeenCalledTimes(1);
    expect(persistence.insert).toHaveBeenCalledTimes(1);
  });

  it('rejects an insert that returns no affected row id', async () => {
    const persistence: WorkoutLogPersistence = {
      findByDate: jest.fn(async () => result(null)),
      updateById: jest.fn(async () => result(null)),
      insert: jest.fn(async () => result(null)),
    };

    await expect(persistWorkoutLog(first, null, persistence)).rejects.toThrow(
      'Workout insert affected no row',
    );
  });
});
