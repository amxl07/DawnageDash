/** Row types hand-written per plans/01-data-contracts.md (schema.ts is stale). */

export type WorkoutStatus = 'done' | 'no' | 'cardio_day' | 'rest_day';
export type Digestion = 'none' | 'bloated' | 'constipated' | 'diarrhea';

/** supabase-js returns numerics as strings — always parseFloat before math. */
export type Numeric = string | number | null;

export type DailyCheckIn = {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD, LOCAL device date — never toISOString()
  morning_weight: Numeric;
  sleep_hours: Numeric;
  workout_status: WorkoutStatus | string | null;
  workout_performance: number | null;
  nutrition_score: number | null;
  calorie_intake: number | null;
  water_liters: Numeric;
  daily_steps: number | null;
  protein: Numeric;
  carbs: Numeric;
  fats: Numeric;
  energy_level: number | null;
  hunger_level: number | null;
  stress_level: number | null;
  digestion: Digestion | string | null;
  notes: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  // NOTE: day_number was DROPPED by migration — never read or write it.
};

export type BodyMeasurement = {
  id: string;
  user_id: string;
  date: string;
  chest: Numeric;
  waist: Numeric;
  hips: Numeric;
  thighs: Numeric;
  arms: Numeric;
  created_at?: string | null;
};

export const num = (v: Numeric | undefined): number => {
  if (v === null || v === undefined) return 0;
  const n = parseFloat(v.toString());
  return Number.isFinite(n) ? n : 0;
};

/** Multiple legacy spellings exist in the data (contract §formulas). */
export function normalizeWorkoutStatus(raw: string | null | undefined): 'done' | 'cardio' | 'rest' | 'no' {
  const s = (raw ?? '').toLowerCase();
  if (s === 'done' || s === 'completed' || s === 'yes') return 'done';
  if (s === 'cardio_day' || s === 'cardio') return 'cardio';
  if (s === 'rest_day' || s === 'rest') return 'rest';
  return 'no';
}
