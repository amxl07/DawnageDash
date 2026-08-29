import type { FormState } from '@/components/checkin/CheckInForm';

import { validateCheckIn, validateCheckInStep } from './checkin-validation';

const EMPTY_FORM: FormState = {
  morningWeight: null,
  sleepHours: null,
  workoutStatus: null,
  workoutPerformance: null,
  nutritionScore: null,
  calorieIntake: null,
  waterLiters: null,
  dailySteps: null,
  protein: null,
  carbs: null,
  fats: null,
  energyLevel: null,
  hungerLevel: null,
  stressLevel: null,
  digestion: null,
  notes: '',
};

describe('validateCheckInStep', () => {
  it('requires the minimum useful fields for each step', () => {
    expect(validateCheckInStep('readiness', EMPTY_FORM)).toMatchObject({
      energyLevel: 'Choose your energy level.',
      stressLevel: 'Choose your stress level.',
    });
    expect(validateCheckInStep('recovery', EMPTY_FORM)).toMatchObject({
      sleepHours: 'Add your sleep hours.',
      hungerLevel: 'Choose your hunger level.',
      digestion: 'Choose your digestion status.',
    });
    expect(validateCheckInStep('adherence', EMPTY_FORM)).toMatchObject({
      workoutStatus: 'Choose today’s training status.',
      nutritionScore: 'Choose your nutrition score.',
    });
    expect(validateCheckInStep('finish', EMPTY_FORM)).toEqual({});
  });

  it('requires performance only after training or cardio', () => {
    expect(validateCheckInStep('adherence', { ...EMPTY_FORM, workoutStatus: 'done' }))
      .toHaveProperty('workoutPerformance');
    expect(validateCheckInStep('adherence', { ...EMPTY_FORM, workoutStatus: 'rest_day' }))
      .not.toHaveProperty('workoutPerformance');
  });

  it('ignores stale performance when the selected workout does not need it', () => {
    expect(
      validateCheckInStep('adherence', {
        ...EMPTY_FORM,
        workoutStatus: 'rest_day',
        workoutPerformance: 11,
        nutritionScore: 5,
      }),
    ).not.toHaveProperty('workoutPerformance');
  });

  it('returns the earliest invalid step when a restored finish draft skips prior validation', () => {
    expect(validateCheckIn(EMPTY_FORM)).toMatchObject({
      step: 'readiness',
      errors: {
        energyLevel: 'Choose your energy level.',
        stressLevel: 'Choose your stress level.',
      },
    });
  });

  it('rejects persisted enum values outside the supported controls', () => {
    expect(
      validateCheckInStep('recovery', {
        ...EMPTY_FORM,
        sleepHours: 7,
        hungerLevel: 5,
        digestion: 'unknown' as FormState['digestion'],
      }),
    ).toHaveProperty('digestion', 'Choose your digestion status.');
    expect(
      validateCheckInStep('adherence', {
        ...EMPTY_FORM,
        workoutStatus: 'missed' as FormState['workoutStatus'],
        nutritionScore: 5,
      }),
    ).toHaveProperty('workoutStatus', 'Choose today’s training status.');
  });

  it('rejects values outside the supported numeric bounds', () => {
    const form: FormState = {
      ...EMPTY_FORM,
      morningWeight: 19.9,
      energyLevel: 11,
      stressLevel: 0,
      sleepHours: 24.5,
      hungerLevel: 11,
      workoutStatus: 'cardio_day',
      workoutPerformance: 0,
      nutritionScore: 11,
      dailySteps: 200001,
      calorieIntake: 20001,
      waterLiters: 20.1,
    };

    expect(validateCheckInStep('readiness', form)).toMatchObject({
      morningWeight: 'Enter a weight between 20 and 400 kg.',
      energyLevel: 'Choose a rating from 1 to 10.',
      stressLevel: 'Choose a rating from 1 to 10.',
    });
    expect(validateCheckInStep('recovery', form)).toMatchObject({
      sleepHours: 'Enter sleep between 0 and 24 hours.',
      hungerLevel: 'Choose a rating from 1 to 10.',
    });
    expect(validateCheckInStep('adherence', form)).toMatchObject({
      workoutPerformance: 'Choose a rating from 1 to 10.',
      nutritionScore: 'Choose a rating from 1 to 10.',
      dailySteps: 'Enter steps between 0 and 200,000.',
      calorieIntake: 'Enter calories between 0 and 20,000.',
      waterLiters: 'Enter water between 0 and 20 L.',
    });
  });
});
