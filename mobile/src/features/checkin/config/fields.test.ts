import { CHECK_IN_FIELDS } from './fields';

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
