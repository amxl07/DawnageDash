import { isDateKeyStrict, localDateString, parseLocalDate } from '@/lib/dates';
import { WEEKLY_PREFILL_KEYS, weeklyReportingWindow, type WeeklyCheckIn, type WeeklyFeedbackDraft, type WeeklyFeedbackForm, type WeeklyPrefillKey, type WeeklyReportSnapshot } from '@/lib/weekly-feedback';
import { WEEKLY_KEYS } from '@/components/weekly/steps';
import type { DailyCheckIn } from '@/types/db';

export { weeklyReportingWindow };
export type { WeeklyPrefillKey };
type WeeklyObservation = Pick<DailyCheckIn, 'date' | 'daily_steps' | 'water_liters' | 'stress_level'>;

export function reportingWindowLabel(window: { from: string; to: string }) {
  const first = parseLocalDate(window.from);
  const last = parseLocalDate(window.to);
  const label = (date: Date, year: boolean) => `${date.getDate()} ${new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date)}${year ? ` ${date.getFullYear()}` : ''}`;
  return window.from === window.to ? label(last, true)
    : `${label(first, first.getFullYear() !== last.getFullYear())}–${label(last, true)}`;
}

export function weeklyAutofill(rows: readonly WeeklyObservation[], today: string) {
  const window = weeklyReportingWindow(today);
  const observed = rows.filter((row) => typeof row.date === 'string'
    && isDateKeyStrict(row.date) && row.date >= window.from && row.date <= window.to);
  const fields = [
    ['step_count', 'daily_steps', 1, 0, Infinity],
    ['water_intake', 'water_liters', 10, 0, 20],
    ['stress_level', 'stress_level', 1, 1, 10],
  ] as const;
  const form: WeeklyFeedbackForm = {};
  const observations = {} as Record<WeeklyPrefillKey, { count: number; dates: string[] }>;
  for (const [key, source, precision, min, max] of fields) {
    const values = observed.flatMap((row) => {
      const raw = row[source];
      if (raw === null || raw === undefined || String(raw).trim() === '') return [];
      const value = Number(raw);
      return Number.isFinite(value) && value >= min && value <= max ? [{ value, date: row.date }] : [];
    });
    const average = values.length ? values.reduce((sum, entry) => sum + entry.value, 0) / values.length : null;
    form[key] = average === null ? '' : String(Math.round(average * precision) / precision);
    observations[key] = { count: values.length, dates: values.map((entry) => entry.date).sort() };
  }
  return { form, observations, window, label: reportingWindowLabel(window) };
}

export function weeklyObservationHint(report: ReturnType<typeof weeklyAutofill>, key: string) {
  const observation = report.observations[key as WeeklyPrefillKey];
  if (!observation) return undefined;
  if (!observation.count) return `No daily observations available for ${report.label}. You can enter your own answer.`;
  const dates = [...new Set(observation.dates)].map((date) => reportingWindowLabel({ from: date, to: date })).join(', ');
  return `Daily records: ${observation.count} observation${observation.count === 1 ? '' : 's'}, recorded ${dates}. Edit if needed.`;
}

/** Legacy entries without a reporting week use their local submission date. */
export function hasWeeklySubmission(history: readonly Pick<WeeklyCheckIn, 'week_start_date' | 'created_at'>[], today: string) {
  const window = weeklyReportingWindow(today);
  return history.some((entry) => {
    if (entry.week_start_date && isDateKeyStrict(entry.week_start_date)) {
      return entry.week_start_date === window.from;
    }
    if (!entry.created_at) return false;
    const timestamp = new Date(entry.created_at);
    if (!Number.isFinite(timestamp.getTime())) return false;
    const date = localDateString(timestamp);
    return date >= window.from && date <= window.to;
  });
}

/** Freeze both the reporting date and the observation sources with the draft. */
export function captureWeeklyReport(report: ReturnType<typeof weeklyAutofill>): WeeklyReportSnapshot {
  return {
    through: report.window.to,
    prefill: Object.fromEntries(WEEKLY_PREFILL_KEYS.map((key) => [key, report.form[key] ?? ''])) as Record<WeeklyPrefillKey, string>,
    observationDates: Object.fromEntries(WEEKLY_PREFILL_KEYS.map((key) => [key, [...report.observations[key].dates]])) as Record<WeeklyPrefillKey, string[]>,
  };
}

export function restoreWeeklyReport(snapshot: WeeklyReportSnapshot): ReturnType<typeof weeklyAutofill> {
  const window = weeklyReportingWindow(snapshot.through);
  return {
    form: { ...snapshot.prefill }, window, label: reportingWindowLabel(window),
    observations: Object.fromEntries(WEEKLY_PREFILL_KEYS.map((key) => [key, {
      count: snapshot.observationDates[key].length, dates: [...snapshot.observationDates[key]],
    }])) as Record<WeeklyPrefillKey, { count: number; dates: string[] }>,
  };
}

export type ConfirmedWeeklyReport = { form: WeeklyFeedbackForm; weekStart: string };
export type WeeklyDraftRecovery = { kind: 'editable' } | { kind: 'cleanup' | 'conflict'; submitted: ConfirmedWeeklyReport };

function submittedWeek(entry: Pick<WeeklyCheckIn, 'week_start_date' | 'created_at'>): string | null {
  if (entry.week_start_date && isDateKeyStrict(entry.week_start_date)) return entry.week_start_date;
  if (!entry.created_at) return null;
  const date = new Date(entry.created_at);
  return Number.isFinite(date.getTime()) ? weeklyReportingWindow(localDateString(date)).from : null;
}

/** Known submitted answers win over leftover drafts; different answers are never discarded. */
export function reconcileWeeklyDraft(
  draft: Pick<WeeklyFeedbackDraft, 'form' | 'report'>,
  history: readonly WeeklyCheckIn[],
  today: string,
  acknowledged?: ConfirmedWeeklyReport | null,
): WeeklyDraftRecovery {
  const weekStart = weeklyReportingWindow(draft.report?.through ?? today).from;
  const candidates: ConfirmedWeeklyReport[] = acknowledged ? [acknowledged] : [];
  for (const entry of history) {
    const week = submittedWeek(entry);
    if (!week) continue;
    candidates.push({ weekStart: week, form: Object.fromEntries(WEEKLY_KEYS.map((key) => [key, entry[key as keyof WeeklyCheckIn] ?? ''])) });
  }
  // Repeated answers cannot establish that an undated draft belongs to an older report.
  const sameWeek = candidates.filter((entry) => entry.weekStart === weekStart);
  const identical = sameWeek.find((entry) =>
    WEEKLY_KEYS.every((key) => (draft.form[key] ?? '') === (entry.form[key] ?? '')));
  if (identical) return { kind: 'cleanup', submitted: identical };
  return sameWeek.length ? { kind: 'conflict', submitted: sameWeek[0] } : { kind: 'editable' };
}
