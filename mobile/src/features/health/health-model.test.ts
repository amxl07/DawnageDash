import { EMPTY_FORM } from '@/features/checkin/model';
import { validateCheckIn } from '@/lib/checkin-validation';
import { healthDayWindow, normalizeMeasurement, selectMorningWeight, sameReviewScope } from './health-model';

const now = new Date(2026, 8, 25, 16, 0);
it('uses local calendar midnights, rejects rolled dates and caps today at read time', () => {
  const past = healthDayWindow('2026-09-24', now);
  expect(past.start).toEqual(new Date(2026, 8, 24));
  expect(past.end).toEqual(new Date(2026, 8, 25));
  expect(past.morningEnd).toEqual(new Date(2026, 8, 24, 12));
  expect(healthDayWindow('2026-09-25', now).end).toEqual(now);
  expect(healthDayWindow('2026-09-25', now).partial).toBe(true);
  expect(() => healthDayWindow('2026-02-30', now)).toThrow();
  expect(() => healthDayWindow('2026-09-26', now)).toThrow();
});
it('uses a calendar day across a daylight-saving boundary', () => {
  // Run this suite with TZ=America/New_York to exercise the 23-hour interval.
  const day = healthDayWindow('2026-03-08', new Date(2026, 2, 9, 10));
  expect(day.end).toEqual(new Date(2026, 2, 9));
  expect(day.end.getTime() - day.start.getTime()).toBe(86400000 + (day.end.getTimezoneOffset() - day.start.getTimezoneOffset()) * 60000);
});
it('preserves absence and explicit zero, validates ranges, and rounds to editor precision', () => {
  expect(normalizeMeasurement('protein', undefined)).toBeNull();
  expect(normalizeMeasurement('protein', 0)).toBe(0);
  expect(normalizeMeasurement('waterLiters', 1.253)).toBe(1.25);
  expect(normalizeMeasurement('morningWeight', 19.99)).toBeNull();
  expect(normalizeMeasurement('dailySteps', NaN)).toBeNull();
  expect(normalizeMeasurement('calorieIntake', 20001)).toBeNull();
});
it('selects the latest valid morning sample, never noon, afternoon, or another day', () => {
  const day = healthDayWindow('2026-09-24', now);
  const samples = [
    { value: 76, time: new Date(2026, 8, 24, 12), sources: ['noon'] },
    { value: 900, time: new Date(2026, 8, 24, 11), sources: ['invalid'] },
    { value: 74.36, time: new Date(2026, 8, 24, 8), sources: ['Scale'] },
    { value: 73, time: new Date(2026, 8, 23, 8), sources: ['yesterday'] },
  ];
  expect(selectMorningWeight(samples, day)).toEqual({ field: 'morningWeight', value: 74.4, observedAt: new Date(2026, 8, 24, 8), sources: ['Scale'] });
});
it('requires unchanged identity, account, date, timezone, revision and every form value', () => {
  const scope = { identity: {}, accountId: 'fictional-a', date: '2026-09-24', timezone: 'Asia/Kolkata', revision: 1, form: { ...EMPTY_FORM } };
  expect(sameReviewScope(scope, { ...scope, form: { ...scope.form } })).toBe(true);
  for (const patch of [{ identity: {} }, { accountId: 'fictional-b' }, { date: '2026-09-23' }, { timezone: 'UTC' }, { revision: 2 }, { form: { ...scope.form, notes: 'edited' } }]) {
    expect(sameReviewScope(scope, { ...scope, ...patch })).toBe(false);
  }
});
it('imported measurements cannot complete the required subjective fields', () => {
  const form = { ...EMPTY_FORM, morningWeight: 74, dailySteps: 6000, calorieIntake: 1800, waterLiters: 2, protein: 100, carbs: 200, fats: 60 };
  expect(validateCheckIn(form).errors).toHaveProperty('energyLevel');
  expect(validateCheckIn(form).errors).toHaveProperty('notes');
  expect(form.workoutPerformance).toBeNull();
});
