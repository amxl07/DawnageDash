import type { DailyCheckIn, Numeric } from '@/types/db';
import { isDateKeyStrict } from '@/lib/dates';

import type { NumericHistoryFieldId } from './config/fields';

export type HistoryPoint = { date: string; value: number };

export type HistoryStat = {
  points: HistoryPoint[];
  min14: number;
  max14: number;
  lastValue: number | null;
  count: number;
};

export type CheckInHistory = Partial<Record<NumericHistoryFieldId, HistoryStat>>;

const HISTORY_FIELDS: Record<NumericHistoryFieldId, keyof DailyCheckIn> = {
  morningWeight: 'morning_weight',
  sleepHours: 'sleep_hours',
  workoutPerformance: 'workout_performance',
  nutritionScore: 'nutrition_score',
  calorieIntake: 'calorie_intake',
  waterLiters: 'water_liters',
  dailySteps: 'daily_steps',
  protein: 'protein',
  carbs: 'carbs',
  fats: 'fats',
  energyLevel: 'energy_level',
  hungerLevel: 'hunger_level',
  stressLevel: 'stress_level',
};

function numericValue(value: Numeric | undefined): number | null {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildHistoryStats(
  checkIns: DailyCheckIn[] | undefined,
  targetDate: string,
): CheckInHistory {
  const priorRows = [...(checkIns ?? [])]
    .filter((row) => isDateKeyStrict(row.date) && row.date < targetDate)
    .sort((a, b) => a.date.localeCompare(b.date));

  return Object.fromEntries(
    (Object.entries(HISTORY_FIELDS) as [NumericHistoryFieldId, keyof DailyCheckIn][]).flatMap(
      ([field, source]) => {
        const points = priorRows
          .flatMap((row) => {
            const value = numericValue(row[source] as Numeric | undefined);
            return value === null ? [] : [{ date: row.date, value }];
          })
          .slice(-30);
        if (points.length === 0) return [];

        const recent = points.slice(-14).map((point) => point.value);
        return [[field, {
          points,
          min14: Math.min(...recent),
          max14: Math.max(...recent),
          lastValue: points.at(-1)?.value ?? null,
          count: points.length,
        } satisfies HistoryStat]];
      },
    ),
  ) as CheckInHistory;
}

function formatted(value: number, precision: number): string {
  return value.toFixed(precision).replace(/\.0+$/, '');
}

export function historyCaption(
  history: HistoryStat | undefined,
  format: { unit?: string; precision?: number },
): string {
  if (!history || history.count < 3) return 'Your range will appear as you log.';
  const precision = format.precision ?? 0;
  const unit = format.unit ? ` ${format.unit}` : '';
  if (history.min14 === history.max14) return `Recently: ${formatted(history.min14, precision)}${unit}`;
  return `Recent range ${formatted(history.min14, precision)}–${formatted(history.max14, precision)}${unit}`;
}
