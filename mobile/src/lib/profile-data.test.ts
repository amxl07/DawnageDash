import { mergeProfileData } from './profile-data';

describe('mergeProfileData', () => {
  it('retains onboarding and unknown keys when profile fields change', () => {
    expect(
      mergeProfileData(
        { primary_goal: 'performance', timezone: 'Asia/Kolkata', custom: 7 },
        { injuries: null, timezone: undefined },
      ),
    ).toEqual({
      primary_goal: 'performance',
      timezone: 'Asia/Kolkata',
      custom: 7,
      injuries: null,
    });
  });

  it('applies assessment overlap fields without dropping profile-only fields', () => {
    expect(
      mergeProfileData(
        { medicalCondition: 'asthma', preferred_units: 'metric', q14: 'old goal' },
        { q14: 'new goal', q56: 'left knee' },
      ),
    ).toEqual({
      medicalCondition: 'asthma',
      preferred_units: 'metric',
      q14: 'new goal',
      q56: 'left knee',
    });
  });

  it('starts from an empty object only when there is no current JSON value', () => {
    expect(mergeProfileData(null, { timezone: 'America/Los_Angeles' })).toEqual({
      timezone: 'America/Los_Angeles',
    });
  });
});
