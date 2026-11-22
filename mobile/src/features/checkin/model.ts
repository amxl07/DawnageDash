import type { CheckInPayload } from './persistence';
import { requiresWorkoutPerformance } from '@/lib/checkin-validation';
import { num, type DailyCheckIn, type Digestion, type WorkoutStatus } from '@/types/db';

export type FormState = {
  morningWeight: number | null;
  sleepHours: number | null;
  workoutStatus: WorkoutStatus | null;
  workoutPerformance: number | null;
  nutritionScore: number | null;
  calorieIntake: number | null;
  waterLiters: number | null;
  dailySteps: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  energyLevel: number | null;
  hungerLevel: number | null;
  stressLevel: number | null;
  digestion: Digestion | null;
  notes: string;
};

export const EMPTY_FORM: FormState = {
  morningWeight: null,
  sleepHours: null,
  workoutStatus: null,
  workoutPerformance: null,
  nutritionScore: null,
  calorieIntake: null,
  waterLiters: null,
  dailySteps: null,
  protein: null,
  carbs: null,
  fats: null,
  energyLevel: null,
  hungerLevel: null,
  stressLevel: null,
  digestion: null,
  notes: '',
};

export function fromRow(row: DailyCheckIn): FormState {
  return {
    morningWeight: row.morning_weight === null ? null : num(row.morning_weight),
    sleepHours: row.sleep_hours === null ? null : num(row.sleep_hours),
    workoutStatus: (row.workout_status as WorkoutStatus) ?? null,
    workoutPerformance: row.workout_performance,
    nutritionScore: row.nutrition_score,
    calorieIntake: row.calorie_intake,
    waterLiters: row.water_liters === null ? null : num(row.water_liters),
    dailySteps: row.daily_steps,
    protein: row.protein === null ? null : num(row.protein),
    carbs: row.carbs === null ? null : num(row.carbs),
    fats: row.fats === null ? null : num(row.fats),
    energyLevel: row.energy_level,
    hungerLevel: row.hunger_level,
    stressLevel: row.stress_level,
    digestion: (row.digestion as Digestion) ?? null,
    notes: row.notes ?? '',
  };
}

/**
 * Only objective measurements are reusable. Subjective scores describe today
 * and must always be answered again instead of being silently copied.
 */
export function prefillFrom(row: DailyCheckIn): Partial<FormState> {
  const f = fromRow(row);
  return {
    morningWeight: f.morningWeight,
    sleepHours: f.sleepHours,
    calorieIntake: f.calorieIntake,
    waterLiters: f.waterLiters,
    dailySteps: f.dailySteps,
    protein: f.protein,
    carbs: f.carbs,
    fats: f.fats,
  };
}

export function toPayload(form: FormState, date: string): CheckInPayload {
  return {
    date,
    morning_weight: form.morningWeight,
    sleep_hours: form.sleepHours,
    workout_status: form.workoutStatus,
    workout_performance: requiresWorkoutPerformance(form.workoutStatus)
      ? form.workoutPerformance
      : null,
    nutrition_score: form.nutritionScore,
    calorie_intake: form.calorieIntake,
    water_liters: form.waterLiters,
    daily_steps: form.dailySteps,
    protein: form.protein,
    carbs: form.carbs,
    fats: form.fats,
    energy_level: form.energyLevel,
    hunger_level: form.hungerLevel,
    stress_level: form.stressLevel,
    digestion: form.digestion,
    notes: form.notes.trim() ? form.notes.trim() : null,
  };
}

export type CheckInStep = 'readiness' | 'recovery' | 'adherence' | 'finish';
