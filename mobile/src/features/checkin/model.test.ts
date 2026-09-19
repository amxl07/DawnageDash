import { EMPTY_FORM, fromRow, prefillFrom, toPayload } from './model';
import type { DailyCheckIn } from '@/types/db';

const row: DailyCheckIn = {
  id: 'fictional-record', user_id: 'fictional-user', date: '2026-09-15',
  morning_weight: '72.4', sleep_hours: '7.5', workout_status: 'done',
  workout_performance: 7, nutrition_score: 8, calorie_intake: 2250,
  water_liters: '2.5', daily_steps: 8200, protein: '140', carbs: '240', fats: '70',
  energy_level: 6, hunger_level: 5, stress_level: 4, digestion: 'none',
  notes: ' An ordinary day. ', created_at: '2026-09-15T04:45:00Z',
};
it('preserves the exact sixteen-field payload and local reporting date', () => {
  expect(Object.keys(EMPTY_FORM)).toHaveLength(16);
  expect(toPayload(fromRow(row), row.date)).toEqual({
    date: '2026-09-15', morning_weight: 72.4, sleep_hours: 7.5,
    workout_status: 'done', workout_performance: 7, nutrition_score: 8,
    calorie_intake: 2250, water_liters: 2.5, daily_steps: 8200,
    protein: 140, carbs: 240, fats: 70, energy_level: 6, hunger_level: 5,
    stress_level: 4, digestion: 'none', notes: 'An ordinary day.',
  });
});
it('keeps optional absence and inapplicable workout performance null', () => {
  expect(toPayload(EMPTY_FORM, row.date)).toEqual(expect.objectContaining({ morning_weight: null, protein: null, notes: null }));
  for (const workoutStatus of ['rest_day', 'no'] as const) {
    expect(toPayload({ ...EMPTY_FORM, workoutStatus, workoutPerformance: 8 }, row.date).workout_performance).toBeNull();
  }
  for (const workoutStatus of ['done', 'cardio_day'] as const) {
    expect(toPayload({ ...EMPTY_FORM, workoutStatus, workoutPerformance: 8 }, row.date).workout_performance).toBe(8);
  }
});
it('allows only objective values to be reused explicitly', () => {
  expect(prefillFrom(row)).toEqual({ morningWeight: 72.4, sleepHours: 7.5, calorieIntake: 2250, waterLiters: 2.5, dailySteps: 8200, protein: 140, carbs: 240, fats: 70 });
});
