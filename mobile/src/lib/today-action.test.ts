import { resolveTodayAction } from './today-action';

it('opens a blocked daily record for correction before suggesting a session', () => {
  expect(resolveTodayAction({ today: '2026-09-15', checkedInToday: false, hasWorkoutPlan: true, planChanged: false, queuedCheckInToday: true, blockedCheckInToday: true }).title).toBe('Your record needs attention');
});

describe('resolveTodayAction', () => {
  it.each([
    [{ today: '2026-09-15', checkedInToday: false, hasWorkoutPlan: true, planChanged: true }, 'check-in'],
    [{ today: '2026-09-15', checkedInToday: true, hasWorkoutPlan: true, planChanged: true }, 'review-update'],
    [{ today: '2026-09-15', checkedInToday: true, hasWorkoutPlan: true, planChanged: false }, 'open-plan'],
    [{ today: '2026-09-15', checkedInToday: true, hasWorkoutPlan: false, planChanged: false }, 'review-progress'],
  ] as const)('chooses one primary action', (input, kind) => {
    expect(resolveTodayAction(input).kind).toBe(kind);
  });

  it('resumes the original workout date before starting another daily task', () => {
    const action = resolveTodayAction({
      today: '2026-09-15',
      checkedInToday: false, hasWorkoutPlan: true, planChanged: true,
      workoutDraft: { date: '2026-09-14', logId: 'workout-7' },
      checkInDraft: { date: '2026-09-15' },
    });
    expect(action.kind).toBe('resume-workout');
    expect(action.route).toEqual({ pathname: '/(app)/logger', params: { date: '2026-09-14', logId: 'workout-7' } });
  });

  it('keeps a backfilled check-in draft attached to its original date', () => {
    const action = resolveTodayAction({
      today: '2026-09-15',
      checkedInToday: false, hasWorkoutPlan: false, planChanged: false,
      checkInDraft: { date: '2026-09-10' },
    });
    expect(action.kind).toBe('resume-checkin');
    expect(action.route).toEqual({ pathname: '/(app)/daily-check-in', params: { date: '2026-09-10' } });
  });

  it('does not prompt for a duplicate check-in while today is queued', () => {
    const action = resolveTodayAction({
      today: '2026-09-15',
      checkedInToday: false, queuedCheckInToday: true,
      hasWorkoutPlan: true, planChanged: false,
    });
    expect(action.kind).toBe('open-plan');
  });

  it('opens the actual next assigned day when it is known', () => {
    const action = resolveTodayAction({
      today: '2026-09-15',
      checkedInToday: true, hasWorkoutPlan: true, planChanged: false,
      nextPlanDay: 2,
    });
    expect(action.route).toEqual({ pathname: '/(app)/logger', params: { day: '2' } });
  });

  it('offers the record after every assigned session has been logged', () => {
    expect(resolveTodayAction({ today: '2026-09-15', checkedInToday: true, hasWorkoutPlan: true, planChanged: false, nextPlanDay: null }).kind).toBe('review-progress');
  });

  it.each([
    ['new', { checkedInToday: false, hasWorkoutPlan: false, planChanged: false }],
    ['blocked', { checkedInToday: false, blockedCheckInToday: true, hasWorkoutPlan: false, planChanged: false }],
    ['queued', { checkedInToday: false, queuedCheckInToday: true, hasWorkoutPlan: false, planChanged: false }],
    ['saved', { checkedInToday: true, hasWorkoutPlan: false, planChanged: false }],
  ] as const)('opens the explicit current date for a %s check-in action', (_state, input) => {
    expect(resolveTodayAction({ today: '2026-09-16', ...input }).route).toEqual({
      pathname: '/(app)/daily-check-in',
      params: { date: '2026-09-16' },
    });
  });

  it('keeps a blocked historical record attached to its original date', () => {
    const route = { pathname: '/(app)/daily-check-in' as const, params: { date: '2026-09-10' } };
    expect(resolveTodayAction({
      today: '2026-09-16', checkedInToday: false, hasWorkoutPlan: false, planChanged: false,
      blockedRecord: { date: '2026-09-10', route },
    }).route).toEqual(route);
  });
});
