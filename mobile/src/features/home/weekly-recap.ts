import { calendarDaysEnding, isDateKeyStrict } from '@/lib/dates';
import { weeklyReportingWindow } from '@/lib/weekly-feedback';
import { parseWorkoutContent } from '@/lib/workout-content';
import type { DailyCheckIn } from '@/types/db';
import type { HomeSection, HomeWorkoutRecord, RecordDay } from './types';

const inWindow = (date: string, window: { from: string; to: string }) =>
  isDateKeyStrict(date) && date >= window.from && date <= window.to;

function revisionTime(row: DailyCheckIn) {
  const timestamp = Date.parse(row.updated_at || row.created_at || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

/** Daily records are unique by reporting date. Prefer the latest saved revision
 * if cached or imported history contains a duplicate; never count it twice. */
function uniqueCheckIns(rows: readonly DailyCheckIn[], today: string) {
  const byDate = new Map<string, DailyCheckIn>();
  for (const row of rows) {
    if (!isDateKeyStrict(row.date) || row.date > today) continue;
    const previous = byDate.get(row.date);
    if (!previous || revisionTime(row) > revisionTime(previous)) byDate.set(row.date, row);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Only confirmed server records feed the recap. Drafts and delivery queues
 * remain in the existing strip and recovery UI, outside these observations. */
export function weeklyRecap(rows: readonly DailyCheckIn[], workouts: readonly HomeWorkoutRecord[], today: string) {
  const window = weeklyReportingWindow(today);
  const weights = uniqueCheckIns(rows, today).flatMap((row) => {
    const raw = row.morning_weight;
    if ((typeof raw !== 'number' && typeof raw !== 'string') || String(raw).trim() === '') return [];
    const value = Number(raw);
    return Number.isFinite(value) && value >= 20 && value <= 400 ? [{ date: row.date, value }] : [];
  });
  const observations = weights.filter((point) => inWindow(point.date, window));
  const change = observations.length > 1
    ? Number((observations[observations.length - 1].value - observations[0].value).toFixed(1)) : null;
  const sessions = new Map<string, HomeWorkoutRecord>();
  for (const row of workouts) {
    if (typeof row.id !== 'string' || !row.id.trim() || !inWindow(row.date, window) || sessions.has(row.id)) continue;
    sessions.set(row.id, row);
  }
  const counts = { logged: sessions.size, completed: 0, partial: 0, unknown: 0 };
  for (const row of sessions.values()) {
    const parsed = parseWorkoutContent(row.content);
    // Older formats may infer completion from entered weight/reps. Require
    // explicit v2 flags and at least one set in every exercise for this claim.
    if (parsed.kind !== 'exercises' || parsed.version !== 2 || !parsed.exercises.length
      || parsed.exercises.some((exercise) => !exercise.sets.length)) {
      counts.unknown += 1;
    } else if (parsed.exercises.every((exercise) => exercise.sets.every((set) => set.completed))) {
      counts.completed += 1;
    } else {
      counts.partial += 1;
    }
  }
  return { window, weight: { observations, latest: weights[weights.length - 1] ?? null, change }, workouts: counts };
}

/** Keep the strip as the single consistency summary, with an elapsed-day
 * denominator and pending delivery separated from confirmed server records. */
export function weekConsistencyLabel(history: HomeSection<DailyCheckIn[]>, records: readonly RecordDay[], today: string, localReady: boolean) {
  if (history.state === 'loading') return 'Loading check-ins…';
  if (history.state === 'error') return 'Check-in history unavailable';
  if (history.stale) return 'Saved check-ins may be out of date';
  if (history.refreshing) return 'Checking saved days…';
  if (!localReady) return 'Waiting for device records';
  const window = weeklyReportingWindow(today);
  const days = calendarDaysEnding(today, 7).filter((date) => date >= window.from).length;
  const saved = new Set(history.data.filter((row) => inWindow(row.date, window)).map((row) => row.date));
  const pending = new Map<string, 'queued' | 'blocked'>();
  for (const record of records) {
    if (!inWindow(record.date, window) || (record.state !== 'queued' && record.state !== 'blocked')) continue;
    saved.add(record.date);
    if (pending.get(record.date) !== 'blocked') pending.set(record.date, record.state);
  }
  const queued = [...pending.values()].filter((state) => state === 'queued').length;
  const blocked = pending.size - queued;
  return [
    `${saved.size} of ${days} ${days === 1 ? 'day' : 'days'} saved`,
    ...(queued ? [`${queued} awaiting sync`] : []),
    ...(blocked ? [`${blocked} ${blocked === 1 ? 'needs' : 'need'} attention`] : []),
  ].join(' · ');
}
