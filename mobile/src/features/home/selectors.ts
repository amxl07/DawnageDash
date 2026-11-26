import { calendarDaysEnding, isDateKeyStrict } from '@/lib/dates';
import type { DailyCheckIn, Numeric } from '@/types/db';
import type { RecentRecordSummary, RecordDay } from './types';

export type { RecordDay } from './types';

export function observedMean(values: (number | null)[]): { value: number | null; samples: number } {
  const present = values.filter((value): value is number => value !== null && Number.isFinite(value));
  return { value: present.length ? present.reduce((sum, value) => sum + value, 0) / present.length : null, samples: present.length };
}

const priority: Record<RecordDay['state'], number> = { absent: 0, synced: 1, draft: 2, queued: 3, blocked: 4 };

export function buildWeekRecords(dates: string[], records: RecordDay[]): RecordDay[] {
  const byDate = new Map<string, RecordDay>();
  for (const record of records) {
    const previous = byDate.get(record.date);
    if (!previous || priority[record.state] >= priority[previous.state]) byDate.set(record.date, record);
  }
  return dates.map((date) => byDate.get(date) ?? { date, state: 'absent' });
}

function reportedNumber(value: Numeric): number | null {
  if (value === null || (typeof value === 'string' && !value.trim())) return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

/** Compare real reporting dates; missing or invalid weights are never endpoints. */
export function recentWeightSummary(rows: DailyCheckIn[], today: string) {
  const observations = rows
    .filter((row) => isDateKeyStrict(row.date) && row.date <= today)
    .flatMap((row) => {
      const value = reportedNumber(row.morning_weight);
      // Match the supported range of the daily check-in weight field.
      return value === null || value < 20 || value > 400 ? [] : [{ date: row.date, value }];
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  const latest = observations[0];
  return latest ? {
    latest,
    previous: observations.find((point) => point.date < latest.date) ?? null,
  } : null;
}

export function recentRecordSummary(rows: DailyCheckIn[], today: string): RecentRecordSummary {
  const window = calendarDaysEnding(today, 7);
  const chartWindow = calendarDaysEnding(today, 14);
  const ordered = rows.filter((row) => isDateKeyStrict(row.date) && row.date <= today).sort((a, b) => a.date.localeCompare(b.date));
  const byDate = new Map(ordered.map((row) => [row.date, reportedNumber(row.morning_weight)]));
  const weightPoints = chartWindow.map((date) => ({ date, value: byDate.get(date) ?? null }));
  const latestWeight = [...ordered].reverse().flatMap((row) => {
    const value = reportedNumber(row.morning_weight);
    return value === null ? [] : [{ value, date: row.date }];
  })[0] ?? null;
  return {
    from: window[0], to: today,
    sleep: observedMean(ordered.filter((row) => row.date >= window[0]).map((row) => reportedNumber(row.sleep_hours))),
    latestWeight,
    weightPoints,
  };
}
