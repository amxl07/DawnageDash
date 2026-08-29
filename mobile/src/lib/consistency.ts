import { addDays, startOfWeek } from 'date-fns';

import type { ProcessedCheckIn } from './checkin-utils';
import { localDateString } from './dates';
import { normalizeWorkoutStatus } from '@/types/db';

export type ConsistencyLevel = 0 | 1 | 2 | 3 | 4;

export type ConsistencyDay = {
  date: Date;
  dateString: string;
  level: ConsistencyLevel;
  inRange: boolean;
  label: string;
};

export const consistencyLevelLabel: Record<ConsistencyLevel, string> = {
  0: 'no check-in',
  1: 'checked in, no training',
  2: 'rest day',
  3: 'cardio',
  4: 'workout done',
};

function levelFor(entry: ProcessedCheckIn | undefined): ConsistencyLevel {
  if (!entry || entry.status !== 'done') return 0;

  switch (normalizeWorkoutStatus(entry.originalCheckIn?.workout_status)) {
    case 'done':
      return 4;
    case 'cardio':
      return 3;
    case 'rest':
      return 2;
    default:
      return 1;
  }
}

export function buildConsistencyHistory(
  processed: ProcessedCheckIn[],
  today = new Date(),
  weekCount = 21,
): ConsistencyDay[] {
  if (!processed.length || weekCount < 1) return [];

  const byDate = new Map(processed.map((entry) => [entry.dateString, entry]));
  const earliest = processed.reduce(
    (earliestDate, entry) => (entry.dateString < earliestDate ? entry.dateString : earliestDate),
    processed[0]!.dateString,
  );
  const todayString = localDateString(today);
  const firstWeekStart = addDays(startOfWeek(today, { weekStartsOn: 1 }), -(weekCount - 1) * 7);

  return Array.from({ length: weekCount * 7 }, (_, index) => addDays(firstWeekStart, index))
    .map((date) => {
      const dateString = localDateString(date);
      const inRange = dateString >= earliest && dateString <= todayString;
      const level = levelFor(byDate.get(dateString));

      return { date, dateString, level, inRange, label: consistencyLevelLabel[level] };
    })
    .filter((day) => day.dateString <= todayString)
    .reverse();
}
