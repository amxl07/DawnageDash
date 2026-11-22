import type { DailyCheckIn } from '@/types/db';

import { buildHistoryStats, historyCaption } from './history';

function row(date: string, overrides: Partial<DailyCheckIn> = {}): DailyCheckIn {
  return {
    id: date,
    user_id: 'user-1',
    date,
    morning_weight: null,
    sleep_hours: null,
    workout_status: null,
    workout_performance: null,
    nutrition_score: null,
    calorie_intake: null,
    water_liters: null,
    daily_steps: null,
    protein: null,
    carbs: null,
    fats: null,
    energy_level: null,
    hunger_level: null,
    stress_level: null,
    digestion: null,
    notes: null,
    ...overrides,
  };
}

describe('buildHistoryStats', () => {
  it('excludes the target date and limits ranges to the latest 14 reported values', () => {
    const rows = Array.from({ length: 16 }, (_, index) =>
      row(`2026-08-${String(index + 1).padStart(2, '0')}`, { morning_weight: 60 + index }),
    );

    const stats = buildHistoryStats(rows, '2026-08-16').morningWeight;

    expect(stats?.points).toHaveLength(15);
    expect(stats?.min14).toBe(61);
    expect(stats?.max14).toBe(74);
    expect(stats?.lastValue).toBe(74);
  });

  it('keeps a reported zero but drops null history values', () => {
    const stats = buildHistoryStats([
      row('2026-08-01', { calorie_intake: null }),
      row('2026-08-02', { calorie_intake: 0 }),
      row('2026-08-03', { calorie_intake: 1800 }),
    ], '2026-08-04').calorieIntake;

    expect(stats?.points).toEqual([
      { date: '2026-08-02', value: 0 },
      { date: '2026-08-03', value: 1800 },
    ]);
  });
});

describe('historyCaption', () => {
  it('reports a neutral recent range with the field precision and unit', () => {
    expect(historyCaption({ points: [], min14: 72.1, max14: 73.4, lastValue: 73, count: 8 }, {
      unit: 'kg', precision: 1,
    })).toBe('Recent range 72.1–73.4 kg');
  });

  it('uses a factual empty state until three values exist', () => {
    expect(historyCaption({ points: [], min14: 0, max14: 0, lastValue: 0, count: 2 }, {
      unit: 'kcal', precision: 0,
    })).toBe('Your range will appear as you log.');
  });
});

