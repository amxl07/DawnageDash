import { supabase } from './supabase';

export type WorkoutLogPayload = {
  user_id: string;
  date: string;
  title: string;
  content: string;
};

type RowResult = Promise<{ data: { id: string } | null; error: unknown }>;

export type WorkoutLogPersistence = {
  findByDate: (userId: string, date: string) => RowResult;
  updateById: (id: string, payload: WorkoutLogPayload) => RowResult;
  insert: (payload: WorkoutLogPayload) => RowResult;
};

const supabasePersistence: WorkoutLogPersistence = {
  findByDate: async (userId, date) =>
    supabase
      .from('workout_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  updateById: async (id, payload) =>
    supabase
      .from('workout_logs')
      .update(payload)
      .eq('id', id)
      .select('id')
      .maybeSingle(),
  insert: async (payload) =>
    supabase.from('workout_logs').insert(payload).select('id').maybeSingle(),
};

function checkedId(
  result: Awaited<RowResult>,
  expectedId: string,
): string | null {
  if (result.error) throw result.error;
  return result.data?.id === expectedId ? expectedId : null;
}

/** Fetch-by-date then update/insert, so retries cannot create duplicate daily logs. */
export async function persistWorkoutLog(
  payload: WorkoutLogPayload,
  requestedId: string | null,
  persistence: WorkoutLogPersistence = supabasePersistence,
): Promise<string> {
  if (requestedId) {
    const updatedId = checkedId(await persistence.updateById(requestedId, payload), requestedId);
    if (updatedId) return updatedId;
  }

  const existing = await persistence.findByDate(payload.user_id, payload.date);
  if (existing.error) throw existing.error;
  if (existing.data?.id) {
    const existingId = existing.data.id;
    const updatedId = checkedId(await persistence.updateById(existingId, payload), existingId);
    if (updatedId) return updatedId;
    throw new Error('Workout update affected no row');
  }

  const inserted = await persistence.insert(payload);
  if (inserted.error) throw inserted.error;
  if (!inserted.data?.id) throw new Error('Workout insert affected no row');
  return inserted.data.id;
}
