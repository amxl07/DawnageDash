import { supabase } from '@/lib/supabase';

export type CheckInPayload = {
  date: string;
  morning_weight: number | null;
  sleep_hours: number | null;
  workout_status: string | null;
  workout_performance: number | null;
  nutrition_score: number | null;
  calorie_intake: number | null;
  water_liters: number | null;
  daily_steps: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  energy_level: number | null;
  hunger_level: number | null;
  stress_level: number | null;
  digestion: string | null;
  notes: string | null;
};

/** Save or update the unique check-in for a client's local calendar day. */
export async function persistCheckIn(userId: string, payload: CheckInPayload) {
  const existingResponse = await supabase
    .from('daily_check_ins')
    .select('id')
    .eq('user_id', userId)
    .eq('date', payload.date)
    .maybeSingle();
  if (existingResponse.error) throw existingResponse;
  const existing = existingResponse.data;

  const row = { ...payload, user_id: userId };
  if (existing) {
    const updateResponse = await supabase
      .from('daily_check_ins')
      .update(row)
      .eq('id', existing.id)
      .eq('user_id', userId)
      .select('id,user_id')
      .maybeSingle();
    if (updateResponse.error) throw updateResponse;
    if (
      updateResponse.data?.id !== existing.id ||
      updateResponse.data?.user_id !== userId
    ) {
      throw Object.assign(new Error('Check-in update affected no owned row'), { status: 403 });
    }
  } else {
    const insertResponse = await supabase
      .from('daily_check_ins')
      .insert(row)
      .select('id,user_id')
      .maybeSingle();
    if (insertResponse.error) throw insertResponse;
    if (!insertResponse.data?.id) {
      throw new Error('Check-in insert affected no owned row');
    }
    if (insertResponse.data.user_id !== userId) {
      throw Object.assign(new Error('Check-in insert returned another owner'), { status: 403 });
    }
  }

  // Fallback for the DB trigger that initializes a client's package start date.
  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('package_start_date')
    .eq('id', userId)
    .maybeSingle();
  if (!userError && userRow && !userRow.package_start_date) {
    await supabase
      .from('users')
      .update({ package_start_date: payload.date })
      .eq('id', userId);
  }

  return { updated: Boolean(existing) };
}
