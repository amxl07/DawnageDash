import { hydrateSetup, nextSetupMilestone } from './setup-model';
it('retains saved goal and timezone on re-entry', () => {
  expect(hydrateSetup({ primary_goal: 'performance', timezone: 'Asia/Kolkata' }, 'UTC')).toEqual({ primaryGoal: 'performance', timezone: 'Asia/Kolkata' });
});
it('does not lower an acknowledged milestone after going Back', () => {
  expect(nextSetupMilestone(2, 0)).toBe(2);
  expect(nextSetupMilestone(2, 1)).toBe(2);
  expect(nextSetupMilestone(2, 2)).toBe(3);
});
it('does not infer a goal from an unknown legacy value', () => {
  expect(hydrateSetup({ primary_goal: 'unknown' }, 'UTC')).toEqual({ primaryGoal: null, timezone: 'UTC' });
});
