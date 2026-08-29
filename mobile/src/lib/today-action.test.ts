import { resolveTodayAction } from './today-action';

describe('resolveTodayAction', () => {
  it.each([
    [{ checkedInToday: false, hasWorkoutPlan: true, planChanged: true }, 'check-in'],
    [{ checkedInToday: true, hasWorkoutPlan: true, planChanged: true }, 'review-update'],
    [{ checkedInToday: true, hasWorkoutPlan: true, planChanged: false }, 'open-plan'],
    [{ checkedInToday: true, hasWorkoutPlan: false, planChanged: false }, 'review-progress'],
  ] as const)('chooses one primary action', (input, kind) => {
    expect(resolveTodayAction(input).kind).toBe(kind);
  });
});
