import { isDateKeyStrict } from '@/lib/dates';

export type ProgramStatus =
  | { kind: 'unknown' }
  | { kind: 'not-started' }
  | { kind: 'pending'; date: string }
  | { kind: 'active'; startDate: string; day: number };

/** Coach assignment and drafts deliberately do not contribute to program start. */
export function resolveProgramStatus({ today, startDate, checkInDates, pendingDates, ready }: {
  today: string;
  startDate: string | null | undefined;
  checkInDates: readonly string[];
  pendingDates: readonly string[];
  ready: boolean;
}): ProgramStatus {
  if (!isDateKeyStrict(today)) return { kind: 'unknown' };
  const validDay = (date: string) => isDateKeyStrict(date) && date <= today;
  const earliest = [...checkInDates].filter(validDay).sort()[0];
  const confirmed = startDate && validDay(startDate) ? startDate : earliest;
  if (confirmed) {
    const days = Math.round((Date.parse(today + 'T00:00:00Z') - Date.parse(confirmed + 'T00:00:00Z')) / 86_400_000);
    return { kind: 'active', startDate: confirmed, day: days + 1 };
  }
  if (!ready || startDate) return { kind: 'unknown' };
  const pending = [...pendingDates].filter(validDay).sort()[0];
  return pending ? { kind: 'pending', date: pending } : { kind: 'not-started' };
}
