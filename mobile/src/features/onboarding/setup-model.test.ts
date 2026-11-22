import { hydrateSetup, nextSetupMilestone, setupDestination } from './setup-model';
it('retains saved goal and timezone on re-entry', () => {
  expect(hydrateSetup({ primary_goal: 'performance', timezone: 'Asia/Kolkata' }, 'UTC')).toEqual({ primaryGoal: 'performance', timezone: 'Asia/Kolkata', startPreference: null });
});
it('does not lower an acknowledged milestone after going Back', () => {
  expect(nextSetupMilestone(2, 0)).toBe(2);
  expect(nextSetupMilestone(2, 1)).toBe(2);
  expect(nextSetupMilestone(2, 2)).toBe(3);
});
it('does not infer a goal from an unknown legacy value', () => {
  expect(hydrateSetup({ primary_goal: 'unknown' }, 'UTC')).toEqual({ primaryGoal: null, timezone: 'UTC', startPreference: null });
});
it('restores the explicit choice to wait without inferring it from a goal', () => {
  expect(hydrateSetup({ start_preference: 'wait_for_coach' }, 'UTC').startPreference).toBe('wait_for_coach');
  expect(hydrateSetup({ start_preference: 'other' }, 'UTC').startPreference).toBeNull();
});
it('takes starters to check-in and waiting or legacy accounts to Home', () => {
  expect(setupDestination('start_now')).toBe('/(app)/(tabs)/check-in');
  expect(setupDestination('wait_for_coach')).toBe('/(app)/(tabs)');
  expect(setupDestination(null)).toBe('/(app)/(tabs)');
});
