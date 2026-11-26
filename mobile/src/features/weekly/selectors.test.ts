import { emptyWeekly } from '@/components/weekly/steps';
import type { WeeklyCheckIn } from '@/lib/weekly-feedback';
import { captureWeeklyReport, reconcileWeeklyDraft, restoreWeeklyReport, hasWeeklySubmission, reportingWindowLabel, weeklyAutofill, weeklyObservationHint, weeklyReportingWindow } from './selectors';

it.each([
  ['2026-09-14', '2026-09-14'], ['2026-09-20', '2026-09-14'], ['2027-01-01', '2026-12-28'],
])('uses Monday-to-today local calendar dates on %s', (today, from) => {
  expect(weeklyReportingWindow(today)).toEqual({ from, to: today });
});

it('averages only observed values inside the reporting week and discloses their dates', () => {
  const row = (date: string, steps: number | null) => ({ date, daily_steps: steps, water_liters: null, stress_level: null });
  const report = weeklyAutofill([row('2026-08-01', 1000), row('2026-09-14', 8000), row('2026-09-19', null), row('2026-09-20', 1000)], '2026-09-19');
  expect(report.form).toEqual({ step_count: '8000', water_intake: '', stress_level: '' });
  expect(report.label).toBe('14 Sep–19 Sep 2026');
  expect(weeklyObservationHint(report, 'step_count')).toContain('Based on 1 recorded day');
});

it('keeps empty weeks blank, retains observed zero, and ignores invalid numeric data', () => {
  expect(weeklyAutofill([], '2026-09-14').form.step_count).toBe('');
  expect(weeklyAutofill([{ date: '2026-09-14', daily_steps: 0, water_liters: 0, stress_level: 4 }, { date: '2026-09-15', daily_steps: NaN, water_liters: null, stress_level: null }], '2026-09-19').form).toEqual({ step_count: '0', water_intake: '0', stress_level: '4' });
});

it('discloses a year boundary without converting calendar dates to UTC', () => {
  expect(reportingWindowLabel({ from: '2026-12-28', to: '2027-01-01' })).toBe('28 Dec 2026–1 Jan 2027');
});

it('uses explicit reporting weeks and supports local dates for older submissions', () => {
  expect(hasWeeklySubmission([{ week_start_date: '2026-09-14', created_at: '2026-09-22T12:00:00Z' }], '2026-09-19')).toBe(true);
  expect(hasWeeklySubmission([{ week_start_date: '2026-09-07', created_at: '2026-09-14T12:00:00Z' }], '2026-09-19')).toBe(false);
  expect(hasWeeklySubmission([{ week_start_date: null, created_at: new Date(2026, 8, 14, 1).toISOString() }], '2026-09-19')).toBe(true);
  expect(hasWeeklySubmission([{ week_start_date: null, created_at: 'invalid' }], '2026-09-19')).toBe(false);
});

it('lists every sparse observation date without implying continuous coverage', () => {
  const report = weeklyAutofill(['2026-09-14', '2026-09-16', '2026-09-19'].map((date) => ({ date, daily_steps: 8000, water_liters: null, stress_level: null })), '2026-09-19');
  expect(weeklyObservationHint(report, 'step_count')).toBe('Based on 3 recorded days. Edit if needed.');
  expect(report.observations.step_count.dates).toEqual(['2026-09-14', '2026-09-16', '2026-09-19']);
});

it('restores frozen source values and dates instead of recomputing a later week', () => {
  const original = weeklyAutofill([{ date: '2026-09-20', daily_steps: 8000, water_liters: 3, stress_level: 4 }], '2026-09-20');
  const snapshot = captureWeeklyReport(original);
  const restored = restoreWeeklyReport(snapshot);
  expect(restored).toEqual(original);
});

it('reconciles exact submitted answers, divergent same-week edits, and independent older weeks', () => {
  const form = { ...emptyWeekly(), overall_feeling: 'Sent answer' };
  const submitted = { ...form, id: 'sent', user_id: 'owner', created_at: '2026-09-20T12:00:00Z', week_start_date: '2026-09-14' } as WeeklyCheckIn;
  const report = captureWeeklyReport(weeklyAutofill([], '2026-09-20'));
  expect(reconcileWeeklyDraft({ form, report }, [submitted], '2026-09-21').kind).toBe('cleanup');
  expect(reconcileWeeklyDraft({ form: { ...form, overall_feeling: 'Newer answer' }, report }, [submitted], '2026-09-21').kind).toBe('conflict');
  expect(reconcileWeeklyDraft({ form: { ...form, overall_feeling: 'Other week' }, report: captureWeeklyReport(weeklyAutofill([], '2026-09-13')) }, [submitted], '2026-09-21').kind).toBe('editable');
  expect(reconcileWeeklyDraft({ form }, [submitted], '2026-09-21').kind).toBe('editable');
});


it.each([false, true])('protects a divergent inferred-week draft before an older exact match (metadata: %s)', (hasMetadata) => {
  const form = { ...emptyWeekly(), overall_feeling: 'Locally retained answer' };
  const olderExact = { ...form, id: 'older', user_id: 'owner', created_at: '2026-09-13T12:00:00Z', week_start_date: '2026-09-07' } as WeeklyCheckIn;
  const currentDivergent = { ...olderExact, id: 'current', overall_feeling: 'Already sent answer', created_at: '2026-09-19T12:00:00Z', week_start_date: '2026-09-14' };
  const report = hasMetadata ? { ...captureWeeklyReport(weeklyAutofill([], '2026-09-19')), inferred: true } : undefined;
  const recovery = reconcileWeeklyDraft({ form, report }, [olderExact, currentDivergent], '2026-09-19');
  expect(recovery).toMatchObject({ kind: 'conflict', submitted: { weekStart: '2026-09-14', form: { overall_feeling: 'Already sent answer' } } });
});

it.each([false, true])('uses exact inferred-week history before an older exact match (metadata: %s)', (hasMetadata) => {
  const form = { ...emptyWeekly(), overall_feeling: 'Repeated answer' };
  const olderExact = { ...form, id: 'older', user_id: 'owner', created_at: '2026-09-13T12:00:00Z', week_start_date: '2026-09-07' } as WeeklyCheckIn;
  const currentExact = { ...olderExact, id: 'current', created_at: '2026-09-19T12:00:00Z', week_start_date: '2026-09-14' };
  const report = hasMetadata ? { ...captureWeeklyReport(weeklyAutofill([], '2026-09-19')), inferred: true } : undefined;
  expect(reconcileWeeklyDraft({ form, report }, [olderExact, currentExact], '2026-09-19')).toMatchObject({ kind: 'cleanup', submitted: { weekStart: '2026-09-14' } });
});


it.each([false, true])('keeps a draft editable when only an older week has identical answers (inferred metadata: %s)', (hasMetadata) => {
  const form = { ...emptyWeekly(), overall_feeling: 'Repeated answer' };
  const olderExact = { ...form, id: 'older', user_id: 'owner', created_at: '2026-09-13T12:00:00Z', week_start_date: '2026-09-07' } as WeeklyCheckIn;
  const report = hasMetadata ? { ...captureWeeklyReport(weeklyAutofill([], '2026-09-19')), inferred: true } : undefined;
  expect(reconcileWeeklyDraft({ form, report }, [olderExact], '2026-09-19')).toEqual({ kind: 'editable' });
});

 it('keeps independent per-field coverage and averages through frozen report restoration', () => {
  const report = weeklyAutofill([
    { date: '2026-09-14', daily_steps: 0, water_liters: 0, stress_level: 0 },
    { date: '2026-09-16', daily_steps: 8000, water_liters: null, stress_level: 4 },
    { date: '2026-09-19', daily_steps: 10000, water_liters: null, stress_level: 6 },
  ], '2026-09-19');
  const restored = restoreWeeklyReport(captureWeeklyReport(report));
  expect(restored.form).toEqual({ step_count: '6000', water_intake: '0', stress_level: '5' });
  expect(weeklyObservationHint(restored, 'step_count')).toBe('Based on 3 recorded days. Edit if needed.');
  expect(weeklyObservationHint(restored, 'water_intake')).toBe('Based on 1 recorded day. Edit if needed.');
  expect(weeklyObservationHint(restored, 'stress_level')).toBe('Based on 2 recorded days. Edit if needed.');
});
