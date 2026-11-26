import { EMPTY_FORM } from '@/features/checkin/model';
import { createHealthReview } from './health-review';
import { healthDayWindow, type HealthField, type HealthReadResult, type HealthReviewScope } from './health-model';

const window = healthDayWindow('2026-09-24', new Date(2026, 8, 25, 10));
const result: HealthReadResult = { status: 'ready', provider: 'Apple Health', window, measurements: [{ field: 'calorieIntake', value: 1800, sources: ['Food log'] }, { field: 'dailySteps', value: 4000, sources: ['Phone'] }], issues: [] };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
function setup() {
  let scope: HealthReviewScope = { identity: {}, accountId: 'fictional', date: '2026-09-24', timezone: 'UTC', revision: 0, form: { ...EMPTY_FORM, calorieIntake: 2100 } };
  const flush = jest.fn(() => true);
  const apply = jest.fn((expected: HealthReviewScope, values: Partial<Record<HealthField, number>>) => { scope = { ...scope, form: { ...scope.form, ...values } }; return true; });
  const read = jest.fn(async () => result);
  const review = createHealthReview({ capture: () => scope, flush, apply, read, now: () => new Date(2026, 8, 25, 10), onChange: () => {} });
  return { review, flush, apply, read, getScope: () => scope, change: (patch: Partial<HealthReviewScope>) => { scope = { ...scope, ...patch }; } };
}
it('flushes before capture, asks before native access, and selects only empty fields', async () => {
  const s = setup();
  s.flush.mockImplementation(() => { s.change({ form: { ...s.getScope().form, dailySteps: 25 } }); return true; });
  expect(s.review.open()).toBe(true);
  expect(s.read).not.toHaveBeenCalled();
  await s.review.read();
  expect(s.review.getState().selected).toEqual([]);
  expect(s.review.getState().scope?.form.dailySteps).toBe(25);
});
it('leaves invalid numeric text in place and does not open or read', async () => {
  const s = setup(); s.flush.mockReturnValue(false);
  expect(s.review.open()).toBe(false);
  await s.review.read();
  expect(s.review.getState().stage).toBe('closed');
  expect(s.read).not.toHaveBeenCalled();
});
it('preserves manual values unless explicitly selected and applies the selection once', async () => {
  const s = setup(); s.review.open(); await s.review.read();
  expect(s.review.getState().selected).toEqual(['dailySteps']);
  expect(s.review.apply()).toBe(true);
  expect(s.getScope().form).toEqual({ ...EMPTY_FORM, calorieIntake: 2100, dailySteps: 4000 });
  expect(s.apply).toHaveBeenCalledTimes(1);
  expect(s.review.apply()).toBe(false);
});
it('explicit replacement can include a previously entered field', async () => {
  const s = setup(); s.review.open(); await s.review.read(); s.review.toggle('calorieIntake');
  expect(s.review.apply()).toBe(true);
  expect(s.getScope().form.calorieIntake).toBe(1800);
});
it.each(['date', 'account', 'timezone', 'form', 'revision'])('rejects a response after %s changes', async kind => {
  const s = setup(); const pending = deferred<HealthReadResult>(); s.read.mockReturnValue(pending.promise);
  s.review.open(); const reading = s.review.read();
  if (kind === 'date') s.change({ date: '2026-09-23' });
  if (kind === 'account') s.change({ accountId: 'other' });
  if (kind === 'timezone') s.change({ timezone: 'Europe/London' });
  if (kind === 'form') s.change({ form: { ...s.getScope().form, notes: 'new' } });
  if (kind === 'revision') s.change({ revision: 1 });
  pending.resolve(result); await reading;
  expect(s.review.getState().result).toBeNull();
  expect(s.review.apply()).toBe(false);
  expect(s.apply).not.toHaveBeenCalled();
});
it('cancel ignores a late native response and prevents a second concurrent read', async () => {
  const s = setup(); const pending = deferred<HealthReadResult>(); s.read.mockReturnValue(pending.promise);
  s.review.open(); const reading = s.review.read(); void s.review.read(); s.review.close(); pending.resolve(result); await reading;
  expect(s.read).toHaveBeenCalledTimes(1);
  expect(s.review.getState().stage).toBe('closed');
  expect(s.apply).not.toHaveBeenCalled();
});
it('a newer edit after review prevents all selected values being applied', async () => {
  const s = setup(); s.review.open(); await s.review.read(); s.change({ form: { ...s.getScope().form, notes: 'newer' } });
  expect(s.review.apply()).toBe(false);
  expect(s.apply).not.toHaveBeenCalled();
});
it('turns an invalid reporting window into a review error without calling native APIs', async () => {
  const s = setup(); s.change({ date: '2999-01-01' }); s.review.open();
  await expect(s.review.read()).resolves.toBeUndefined();
  expect(s.read).not.toHaveBeenCalled(); expect(s.review.getState().error).toMatch(/reporting day/i);
});
