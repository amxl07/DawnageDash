import { CHECK_IN_FIELDS } from './fields';
import { isSingleScrollCheckInEnabled } from './featureFlags';

describe('daily check-in registry', () => {
  it('preserves every production field in the established section order', () => {
    expect(CHECK_IN_FIELDS.map((field) => field.id)).toEqual([
      'morningWeight',
      'energyLevel',
      'stressLevel',
      'sleepHours',
      'hungerLevel',
      'digestion',
      'workoutStatus',
      'workoutPerformance',
      'nutritionScore',
      'calorieIntake',
      'waterLiters',
      'dailySteps',
      'protein',
      'carbs',
      'fats',
      'notes',
    ]);
  });

  it('keeps exact database enum values in the declarations', () => {
    expect(CHECK_IN_FIELDS.find((field) => field.id === 'workoutStatus')?.options).toEqual([
      { value: 'done', label: 'Done' },
      { value: 'no', label: 'No' },
      { value: 'cardio_day', label: 'Cardio' },
      { value: 'rest_day', label: 'Rest' },
    ]);
    expect(CHECK_IN_FIELDS.find((field) => field.id === 'digestion')?.options).toEqual([
      { value: 'none', label: 'Normal' },
      { value: 'bloated', label: 'Bloated' },
      { value: 'constipated', label: 'Constipated' },
      { value: 'diarrhea', label: 'Diarrhea' },
    ]);
  });
});

describe('single-scroll feature flag', () => {
  it.each([undefined, '', 'true', '1', 'on'])('enables the trial for %p', (value) => {
    expect(isSingleScrollCheckInEnabled(value)).toBe(true);
  });

  it.each(['false', '0', 'off', 'FALSE'])('restores the wizard for %p', (value) => {
    expect(isSingleScrollCheckInEnabled(value)).toBe(false);
  });
});
