import { supabase } from './supabase';

export type WorkoutLogPayload = {
  user_id: string;
  date: string;
  title: string;
  content: string;
};

type DeliveryResult<T> = { data: T; error: unknown; status?: number };
type RowResult = Promise<DeliveryResult<{ id: string } | null>>;

export type WorkoutLogPersistence = {
  findAllByDate: (userId: string, date: string) => Promise<DeliveryResult<{ id: string }[] | null>>;
  updateById: (id: string, payload: WorkoutLogPayload) => RowResult;
  insert: (payload: WorkoutLogPayload) => RowResult;
};

const supabasePersistence: WorkoutLogPersistence = {
  findAllByDate: async (userId, date) =>
    supabase
      .from('workout_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at', { ascending: false }),
  updateById: async (id, payload) =>
    supabase
      .from('workout_logs')
      .update(payload)
      .eq('id', id)
      .eq('user_id', payload.user_id)
      .select('id')
      .maybeSingle(),
  insert: async (payload) =>
    supabase.from('workout_logs').insert(payload).select('id').maybeSingle(),
};

function checkedId(
  result: Awaited<RowResult>,
  expectedId: string,
): string | null {
  if (result.error) throw result;
  return result.data?.id === expectedId ? expectedId : null;
}

/** Owned updates and unambiguous date recovery. Concurrent-device uniqueness requires a server contract. */
export async function persistWorkoutLog(
  payload: WorkoutLogPayload,
  requestedId: string | null,
  persistence: WorkoutLogPersistence = supabasePersistence,
): Promise<string> {
  if (requestedId) {
    const updatedId = checkedId(await persistence.updateById(requestedId, payload), requestedId);
    if (updatedId) return updatedId;
    throw Object.assign(new Error('Workout is missing or no longer editable'), { status: 403 });
  }

  const existing = await persistence.findAllByDate(payload.user_id, payload.date);
  if (existing.error) throw existing;
  if ((existing.data?.length ?? 0) > 1) {
    throw Object.assign(new Error('Choose which workout to edit'), { status: 409 });
  }
  if (existing.data?.length) {
    const existingId = existing.data[0].id;
    const updatedId = checkedId(await persistence.updateById(existingId, payload), existingId);
    if (updatedId) return updatedId;
    throw new Error('Workout update affected no row');
  }

  const inserted = await persistence.insert(payload);
  if (inserted.error) throw inserted;
  if (!inserted.data?.id) throw new Error('Workout insert affected no row');
  return inserted.data.id;
}
