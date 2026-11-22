/**
 * Date helpers. The check-in date is ALWAYS the local device date —
 * toISOString() would roll over a day for anyone east/west of UTC at the
 * wrong hour, and UNIQUE(user_id, date) makes that a hard failure.
 */
export function localDateString(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseLocalDate(s: string): Date {
  const parts = strictDateParts(s);
  if (!parts) throw new RangeError(`Invalid local date key: ${s}`);

  const parsed = new Date(0);
  parsed.setFullYear(parts.year, parts.month - 1, parts.day);
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

function strictDateParts(value: string) {
  const match = DATE_KEY.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(0);
  candidate.setFullYear(year, month - 1, day);
  candidate.setHours(0, 0, 0, 0);

  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

/** True only for a real local calendar date written exactly as YYYY-MM-DD. */
export function isDateKeyStrict(value: string): boolean {
  return strictDateParts(value) !== null;
}

/**
 * Builds an inclusive window by stepping local calendar components. This
 * deliberately avoids millisecond arithmetic, which skips/repeats hours at
 * daylight-saving transitions.
 */
export function calendarDaysEnding(dateKey: string, count: number): string[] {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError('Calendar window count must be a non-negative integer.');
  }
  if (count === 0) return [];

  const end = parseLocalDate(dateKey);
  const days: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(end);
    date.setDate(end.getDate() - offset);
    days.push(localDateString(date));
  }
  return days;
}
