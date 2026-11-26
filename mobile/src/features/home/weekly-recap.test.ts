import { fixtureDailyCheckIn } from '@/testing/redesignFixtures';
import { localDateString } from '@/lib/dates';
import { serializeWorkoutContent } from '@/lib/workout-content';
import { weeklyRecap, weekConsistencyLabel } from './weekly-recap';
import type { HomeSection, HomeWorkoutRecord, RecordDay } from './types';

const ready = <T,>(data: T): HomeSection<T> => ({ state: 'ready', data, stale: false, retry: jest.fn() });
const row = (date: string, morning_weight: number | string | null, overrides = {}) => ({
  ...fixtureDailyCheckIn, id: date, date, morning_weight, ...overrides,
});
const workout = (id: string, date: string, flags: boolean[]): HomeWorkoutRecord => ({
  id, date, content: serializeWorkoutContent({ planDayNumber: 1, exercises: [{
    name: 'Squat', sets: flags.map((completed, index) => ({ setNumber: index + 1, reps: '8', weight: '40', rpe: '7', completed })),
  }] }),
});

describe('weekly recap observations', () => {
  it('uses Monday through the reporting date, across gaps, without including earlier or future weight', () => {
    const summary = weeklyRecap([
      row('2026-09-13', 75), row('2026-09-14', 73), row('2026-09-16', null),
      row('2026-09-18', '72.4'), row('2026-09-19', 69), row('2026-09-31', 50),
    ], [], '2026-09-18');
    expect(summary.window).toEqual({ from: '2026-09-14', to: '2026-09-18' });
    expect(summary.weight.observations).toEqual([{ date: '2026-09-14', value: 73 }, { date: '2026-09-18', value: 72.4 }]);
    expect(summary.weight.change).toBe(-0.6);
    expect(summary.weight.latest).toEqual({ date: '2026-09-18', value: 72.4 });
  });

  it('deduplicates a reporting date using the newest saved revision and never compares a day with itself', () => {
    const summary = weeklyRecap([
      row('2026-09-15', 72, { updated_at: '2026-09-15T14:00:00Z' }),
      row('2026-09-15', 80, { updated_at: '2026-09-15T10:00:00Z' }),
      row('2026-09-15', 72, { updated_at: '2026-09-15T14:00:00Z' }),
    ], [], '2026-09-15');
    expect(summary.weight.observations).toEqual([{ date: '2026-09-15', value: 72 }]);
    expect(summary.weight.change).toBeNull();
  });

  it.each([null, '', ' ', '72kg', 'NaN', NaN, Infinity, 0, 19.9, 400.1])('rejects invalid weight %s but keeps the latest older dated observation', (value) => {
    const summary = weeklyRecap([row('2026-09-10', 73), row('2026-09-15', value)], [], '2026-09-15');
    expect(summary.weight.observations).toEqual([]);
    expect(summary.weight.change).toBeNull();
    expect(summary.weight.latest).toEqual({ date: '2026-09-10', value: 73 });
  });

  it('does not restore an older duplicate weight after the latest saved revision removed it', () => {
    expect(weeklyRecap([
      row('2026-09-15', 72, { updated_at: '2026-09-15T10:00:00Z' }),
      row('2026-09-15', null, { updated_at: '2026-09-15T14:00:00Z' }),
    ], [], '2026-09-15').weight).toEqual({ observations: [], latest: null, change: null });
  });

  it('accepts both supported weight boundaries and reports no observation for confirmed emptiness', () => {
    expect(weeklyRecap([row('2026-09-14', 20), row('2026-09-15', 400)], [], '2026-09-15').weight.change).toBe(380);
    expect(weeklyRecap([], [], '2026-09-15').weight).toEqual({ observations: [], latest: null, change: null });
  });

  it('rolls the window at local Monday midnight and handles a year boundary', () => {
    expect(weeklyRecap([], [], localDateString(new Date(2026, 8, 20, 23, 59))).window).toEqual({ from: '2026-09-14', to: '2026-09-20' });
    expect(weeklyRecap([row('2026-09-20', 72)], [], localDateString(new Date(2026, 8, 21, 0, 0))).weight.observations).toEqual([]);
    expect(weeklyRecap([], [], '2027-01-01').window).toEqual({ from: '2026-12-28', to: '2027-01-01' });
  });
});

describe('weekly workout completion', () => {
  it('requires every set in every current exercise to be explicitly completed', () => {
    const complete = workout('complete', '2026-09-15', [true, true]);
    const summary = weeklyRecap([], [complete, complete,
      workout('partial', '2026-09-15', [true, false]),
      { id: 'legacy', date: '2026-09-14', content: JSON.stringify([{ exercise: 'Squat', sets: [{ reps: '8', weight: '40' }] }]) },
      { id: 'text', date: '2026-09-14', content: 'A walk' },
      workout('empty', '2026-09-15', []),
      workout('old', '2026-09-13', [true]), workout('future', '2026-09-16', [true]),
      workout('invalid', '2026-09-31', [true]), workout('', '2026-09-15', [true]),
    ], '2026-09-15');
    expect(summary.workouts).toEqual({ logged: 5, completed: 1, partial: 1, unknown: 3 });
  });

  it('does not turn a malformed current exercise or a truthy flag into completed work', () => {
    const malformed = { version: 2, exercises: [{ name: 'Squat', sets: [{ completed: true }] }, { name: 'Other', sets: [] }] };
    const truthy = { version: 2, exercises: [{ name: 'Squat', sets: [{ completed: 'true', reps: '8', weight: '40' }] }] };
    expect(weeklyRecap([], [
      { id: 'malformed', date: '2026-09-15', content: malformed },
      { id: 'truthy', date: '2026-09-15', content: truthy },
    ], '2026-09-15').workouts).toEqual({ logged: 2, completed: 0, partial: 1, unknown: 1 });
  });
});

describe('the shared check-in consistency summary', () => {
  const records: RecordDay[] = [
    { date: '2026-09-14', state: 'draft' },
    { date: '2026-09-15', state: 'queued' },
    { date: '2026-09-15', state: 'queued' },
    { date: '2026-09-16', state: 'synced' },
    { date: 'invalid', state: 'synced' },
  ];
  it('excludes drafts and future dates, counts pending once, and retains the prior saved record while edited', () => {
    expect(weekConsistencyLabel(ready([row('2026-09-14', 73)]), records, '2026-09-15', true)).toBe('2 of 2 days saved · 1 awaiting sync');
    expect(weekConsistencyLabel(ready([]), records, '2026-09-15', true)).toBe('1 of 2 days saved · 1 awaiting sync');
    expect(weekConsistencyLabel(ready([]), [], '2026-09-14', true)).toBe('0 of 1 day saved');
  });

  it.each([
    [{ state: 'loading' }, 'Loading check-ins…'],
    [{ state: 'error', retry: jest.fn() }, 'Check-in history unavailable'],
    [{ ...ready([]), stale: true }, 'Saved check-ins may be out of date'],
    [{ ...ready([]), refreshing: true }, 'Checking saved days…'],
  ] as const)('never turns an uncertain source into zero consistency (%j)', (source, label) => {
    expect(weekConsistencyLabel(source, [], '2026-09-15', true)).toBe(label);
  });

  it('keeps unknown device records and blocked delivery explicit', () => {
    expect(weekConsistencyLabel(ready([]), [], '2026-09-15', false)).toBe('Waiting for device records');
    expect(weekConsistencyLabel(ready([]), [{ date: '2026-09-15', state: 'blocked' }], '2026-09-15', true)).toBe('1 of 2 days saved · 1 needs attention');
  });
});
