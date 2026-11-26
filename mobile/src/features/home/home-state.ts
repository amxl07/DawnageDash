import type { Href } from 'expo-router';
import { isDateKeyStrict, localDateString, parseLocalDate } from '@/lib/dates';
import { parseWorkoutContent } from '@/lib/workout-content';
import type { HomeData, HomeSection } from './types';

export type PendingRecord = {
  kind: 'check-in' | 'workout';
  id: string;
  date: string;
  logId?: string | null;
  queuedAt: number;
  failure?: { retryable: boolean };
};

export function isBlocked(item: { failure?: { retryable: boolean } }): boolean {
  return item.failure?.retryable === false;
}

export function prioritizedPending(records: PendingRecord[]): PendingRecord[] {
  return [...records].sort((a, b) => Number(isBlocked(b)) - Number(isBlocked(a)) || a.queuedAt - b.queuedAt);
}

export function pendingRecordRoute(record: PendingRecord): Href {
  return record.kind === 'check-in'
    ? { pathname: '/(app)/daily-check-in', params: { date: record.date } }
    : { pathname: '/(app)/logger', params: { date: record.date, outboxId: record.id, ...(record.logId ? { logId: record.logId } : {}) } };
}

/** Presence can be established locally; stale absence cannot authorize creation. */
export function actionReadiness(input: {
  checkIns: HomeSection<unknown>;
  hasToday: boolean;
  hasLocalToday: boolean;
  hasRecovery: boolean;
  localReady: boolean;
}): boolean {
  return input.hasRecovery || (input.localReady && (input.hasToday || input.hasLocalToday || (input.checkIns.state === 'ready' && !input.checkIns.stale && !input.checkIns.refreshing)));
}

export function homePlanSection(
  profile: HomeSection<{ active_workout_plan: string | null } | null>,
  plan: HomeData['plan'],
): HomeData['plan'] {
  if (profile.state !== 'ready') return profile;
  let pointer: unknown;
  try { pointer = JSON.parse(profile.data?.active_workout_plan || 'null'); } catch { pointer = null; }
  const valid = typeof pointer === 'object' && pointer !== null &&
    'level' in pointer && typeof pointer.level === 'string' && Boolean(pointer.level.trim()) &&
    'workoutType' in pointer && typeof pointer.workoutType === 'string' && Boolean(pointer.workoutType.trim()) &&
    'daysPerWeek' in pointer && typeof pointer.daysPerWeek === 'number' && Number.isInteger(pointer.daysPerWeek) && pointer.daysPerWeek > 0 && pointer.daysPerWeek <= 7;
  if (!valid) return { state: 'ready', data: { days: [], source: 'none' }, stale: profile.stale, retry: profile.retry };
  return plan.state === 'ready' && profile.stale ? { ...plan, stale: true, retry: profile.retry } : plan;
}

/** Pending V2 records are saved work, even before delivery succeeds. */
export function queuedPlanDays(records: { date: string; content: string }[], today: string): number[] {
  const monday = parseLocalDate(today);
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  const start = localDateString(monday);
  const days = new Set<number>();
  for (const record of records) {
    if (!isDateKeyStrict(record.date) || record.date < start || record.date > today) continue;
    const parsed = parseWorkoutContent(record.content);
    if (parsed.kind === 'exercises' && parsed.version === 2 && parsed.planDayNumber && parsed.planDayNumber > 0) days.add(parsed.planDayNumber);
  }
  return [...days];
}
