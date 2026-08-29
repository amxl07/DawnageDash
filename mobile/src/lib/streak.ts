import { addDays, differenceInCalendarDays, startOfWeek } from 'date-fns';

import type { ProcessedCheckIn } from './checkin-utils';
import { localDateString } from './dates';

/**
 * Consecutive days ending today or yesterday.
 *
 * Yesterday counts so the streak doesn't visibly "break" during the day before
 * the user has had a chance to check in — that would punish them for the clock,
 * not their behaviour.
 */
export function calculateStreak(processed: ProcessedCheckIn[]): number {
  if (!processed.length) return 0;
  // processed is newest-first.
  const done = new Set(processed.filter((p) => p.status === 'done').map((p) => p.dateString));
  const today = new Date();
  const todayStr = localDateString(today);
  const yesterdayStr = localDateString(addDays(today, -1));

  let cursor: Date;
  if (done.has(todayStr)) cursor = today;
  else if (done.has(yesterdayStr)) cursor = addDays(today, -1);
  else return 0;

  let streak = 0;
  while (done.has(localDateString(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export type WeekDay = {
  date: Date;
  dateString: string;
  /** Short label, e.g. "M". */
  initial: string;
  state: 'done' | 'missed' | 'today-pending' | 'future';
  workoutStatus: string | null;
};

/** Mon→Sun strip for the current week. Powers the dashboard week strip. */
export function buildWeekStrip(processed: ProcessedCheckIn[]): WeekDay[] {
  const today = new Date();
  const todayStr = localDateString(today);
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const byDate = new Map(processed.map((p) => [p.dateString, p]));
  const initials = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const dateString = localDateString(date);
    const entry = byDate.get(dateString);
    const isFuture = differenceInCalendarDays(date, today) > 0;

    let state: WeekDay['state'];
    if (isFuture) state = 'future';
    else if (entry?.status === 'done') state = 'done';
    else if (dateString === todayStr) state = 'today-pending';
    else state = 'missed';

    return {
      date,
      dateString,
      initial: initials[i],
      state,
      workoutStatus: entry?.originalCheckIn?.workout_status ?? null,
    };
  });
}
