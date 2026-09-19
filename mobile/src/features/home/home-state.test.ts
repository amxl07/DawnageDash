import { actionReadiness, homePlanSection, pendingRecordRoute, prioritizedPending, queuedPlanDays } from './home-state';
import { serializeWorkoutContent } from '@/lib/workout-content';

const ready = <T,>(data: T, stale = false) => ({ state: 'ready' as const, data, stale, retry: jest.fn() });

it('uses stale data to prove presence, never absence', () => {
  expect(actionReadiness({ checkIns: ready([], true), hasToday: false, hasLocalToday: false, hasRecovery: false, localReady: true })).toBe(false);
  expect(actionReadiness({ checkIns: ready([], true), hasToday: true, hasLocalToday: false, hasRecovery: false, localReady: true })).toBe(true);
  expect(actionReadiness({ checkIns: { state: 'error', retry: jest.fn() }, hasToday: false, hasLocalToday: true, hasRecovery: false, localReady: true })).toBe(true);
});

it('resolves a loaded profile without a valid pointer to an empty plan', () => {
  for (const pointer of [null, '', 'broken', '{}', '{"level":"beginner"}']) {
    expect(homePlanSection(ready({ active_workout_plan: pointer }), { state: 'loading' })).toEqual(expect.objectContaining({ state: 'ready', data: { days: [], source: 'none' } }));
  }
  const retry = jest.fn();
  expect(homePlanSection({ state: 'error', retry }, { state: 'loading' })).toEqual({ state: 'error', retry });
  expect(homePlanSection(ready({ active_workout_plan: null }, true), { state: 'loading' })).toEqual(expect.objectContaining({ state: 'ready', stale: true }));
});

it('selects the blocked record itself and preserves workout recovery identity', () => {
  const pending = prioritizedPending([
    { kind: 'check-in', id: 'queued', date: '2026-09-15', queuedAt: 1 },
    { kind: 'workout', id: 'rejected', date: '2026-09-14', logId: 'owned', queuedAt: 2, failure: { retryable: false } },
  ]);
  expect(pending[0].id).toBe('rejected');
  expect(pendingRecordRoute(pending[0])).toEqual({ pathname: '/(app)/logger', params: { date: '2026-09-14', logId: 'owned', outboxId: 'rejected' } });
});

it('counts a pending plan day only within the current reporting week', () => {
  const content = serializeWorkoutContent({ exercises: [], planDayNumber: 2 });
  expect(queuedPlanDays([{ date: '2026-09-15', content }, { date: '2026-09-13', content: serializeWorkoutContent({ exercises: [], planDayNumber: 3 }) }], '2026-09-15')).toEqual([2]);
});
