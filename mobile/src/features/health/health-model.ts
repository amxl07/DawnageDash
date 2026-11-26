import { CHECK_IN_FIELDS, type CheckInFieldDef } from '@/features/checkin/config/fields';
import type { FormState } from '@/features/checkin/model';
import { isDateKeyStrict } from '@/lib/dates';

export const HEALTH_UNAVAILABLE_MESSAGE = 'Health import is unavailable in this version of Dawnage. Continue entering values manually.';
export const HEALTH_FIELDS = ['morningWeight', 'dailySteps', 'calorieIntake', 'waterLiters', 'protein', 'carbs', 'fats'] as const;
export type HealthField = (typeof HEALTH_FIELDS)[number];
export type HealthMeasurement = { field: HealthField; value: number; sources: string[]; observedAt?: Date };
export type HealthIssue = { field: HealthField; kind: 'empty' | 'denied' | 'error' | 'invalid' | 'ambiguous-zero'; message: string };
export type HealthWindow = { date: string; start: Date; end: Date; morningEnd: Date; readAt: Date; partial: boolean; timezone: string };
export type HealthReadResult = {
  status: 'ready' | 'empty' | 'denied' | 'unavailable' | 'error';
  provider: string;
  window: HealthWindow;
  measurements: HealthMeasurement[];
  issues: HealthIssue[];
  message?: string;
  retryable?: boolean;
};
export type HealthReviewScope = { identity: unknown; accountId: string; date: string; timezone: string; revision: number; form: FormState };

export function currentTimezone() { return Intl.DateTimeFormat().resolvedOptions().timeZone; }
export function healthDayWindow(date: string, readAt = new Date()): HealthWindow {
  if (!isDateKeyStrict(date) || !Number.isFinite(readAt.getTime())) throw new Error('Choose a valid reporting day.');
  const [year, month, day] = date.split('-').map(Number);
  const start = new Date(year, month - 1, day);
  const nextStart = new Date(year, month - 1, day + 1);
  const end = new Date(Math.min(nextStart.getTime(), readAt.getTime()));
  if (end <= start) throw new Error('This reporting day has no elapsed time to read.');
  return { date, start, end, morningEnd: new Date(Math.min(new Date(year, month - 1, day, 12).getTime(), end.getTime())), readAt, partial: readAt < nextStart, timezone: currentTimezone() };
}
export function healthFieldDefinition(field: HealthField): CheckInFieldDef { return CHECK_IN_FIELDS.find(f => f.id === field)!; }
export function healthFieldLabel(field: HealthField) { return field === 'calorieIntake' ? 'Food calories' : healthFieldDefinition(field).label; }
export function normalizeMeasurement(field: HealthField, value: unknown): number | null {
  const def = healthFieldDefinition(field);
  if (typeof value !== 'number' || !Number.isFinite(value) || value < (def.min ?? 0) || (def.max !== undefined && value > def.max)) return null;
  return Number(value.toFixed(def.precision ?? 0));
}
export function selectMorningWeight(samples: { value: unknown; time: Date; sources: string[] }[], window: HealthWindow): HealthMeasurement | null {
  const sorted = samples.filter(s => Number.isFinite(s.time.getTime()) && s.time >= window.start && s.time < window.morningEnd).sort((a, b) => b.time.getTime() - a.time.getTime());
  for (const sample of sorted) {
    const value = normalizeMeasurement('morningWeight', sample.value);
    if (value !== null) return { field: 'morningWeight', value, observedAt: sample.time, sources: sample.sources };
  }
  return null;
}
export function sameReviewScope(a: HealthReviewScope, b: HealthReviewScope | null): boolean {
  return !!b && a.identity === b.identity && a.accountId === b.accountId && a.date === b.date && a.timezone === b.timezone && a.revision === b.revision && CHECK_IN_FIELDS.every(({ id }) => Object.is(a.form[id], b.form[id]));
}
export function finishHealthRead(provider: string, window: HealthWindow, measurements: HealthMeasurement[], issues: HealthIssue[], emptyMessage: string): HealthReadResult {
  const status = measurements.length ? 'ready' : issues.some(i => i.kind === 'error') ? 'error' : issues.length > 0 && issues.every(i => i.kind === 'denied') ? 'denied' : 'empty';
  return { provider, window, measurements, issues, status, message: status === 'error' ? 'Health records could not be read. Unlock your device and try again.' : status === 'denied' ? 'Read access is off for these measurements. You can change access in Health Connect settings, then retry.' : status === 'empty' ? emptyMessage : undefined, retryable: issues.some(i => i.kind === 'error') || status !== 'ready' };
}
