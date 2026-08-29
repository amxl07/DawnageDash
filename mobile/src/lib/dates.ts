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
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
