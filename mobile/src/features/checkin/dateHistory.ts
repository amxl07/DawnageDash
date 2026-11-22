import { buildConsistencyHistory, type ConsistencyDay } from '@/lib/consistency';
import type { ProcessedCheckIn } from '@/lib/checkin-utils';
import { isDateKeyStrict, localDateString, parseLocalDate } from '@/lib/dates';
import type { CheckInOutboxItem } from './checkInOutbox';

export type LocalCheckInDay = { date: string; status: 'queued' | 'blocked' };
export function localCheckInDays(items: CheckInOutboxItem[]): LocalCheckInDay[] {
  return items.map((item) => ({ date: item.payload.date, status: item.failure && !item.failure.retryable ? 'blocked' : 'queued' }));
}
/** Local intents are selectable even before the first server row or outside its window. */
export function buildCheckInDateHistory(processed: ProcessedCheckIn[], local: LocalCheckInDay[], today = new Date()): ConsistencyDay[] {
  const days = new Map(buildConsistencyHistory(processed, today).map((day) => [day.dateString, day]));
  const latest = localDateString(today);
  for (const record of local) {
    if (!isDateKeyStrict(record.date) || record.date > latest) continue;
    days.set(record.date, {
      date: parseLocalDate(record.date), dateString: record.date, level: 0, inRange: true,
      label: record.status === 'blocked' ? 'Saved on this device · needs attention' : 'Saved on this device · waiting to sync',
    });
  }
  return [...days.values()].sort((a, b) => b.dateString.localeCompare(a.dateString));
}
