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

const COMPLETE_FORM: FormState = {
  morningWeight: 72.4, sleepHours: 7, workoutStatus: 'rest_day', workoutPerformance: null,
  nutritionScore: 7, calorieIntake: 2100, waterLiters: 2.5, dailySteps: 8000,
  protein: 140, carbs: 220, fats: 60, energyLevel: 6, hungerLevel: 5,
  stressLevel: 3, digestion: 'none', notes: 'Rest day; felt recovered.',
};

describe('validateCheckInStep', () => {
  it('groups weight, sleep and energy before the separate day context', () => {
    expect(Object.keys(validateCheckInStep('readiness', EMPTY_FORM)).sort())
      .toEqual(['energyLevel', 'morningWeight', 'sleepHours']);
    expect(Object.keys(validateCheckInStep('recovery', EMPTY_FORM)).sort())
      .toEqual(['digestion', 'hungerLevel', 'stressLevel']);
    expect(validateCheckIn({ ...COMPLETE_FORM, sleepHours: null }).step).toBe('readiness');
    expect(validateCheckIn({ ...COMPLETE_FORM, stressLevel: null }).step).toBe('recovery');
  });
  it('requires every applicable field for each step', () => {
    expect(validateCheckInStep('readiness', EMPTY_FORM)).toMatchObject({
      energyLevel: 'Choose your energy level.',
      sleepHours: 'Add your sleep hours.',
    });
    expect(validateCheckInStep('recovery', EMPTY_FORM)).toMatchObject({
      stressLevel: 'Choose your stress level.',
      hungerLevel: 'Choose your hunger level.',
      digestion: 'Choose your digestion status.',
    });
    expect(validateCheckInStep('adherence', EMPTY_FORM)).toMatchObject({
      workoutStatus: 'Choose today’s training status.',
      nutritionScore: 'Choose your nutrition score.',
    });
    expect(validateCheckInStep('finish', EMPTY_FORM)).toHaveProperty('notes');
  });

  it.each([
    ['morningWeight', 'readiness'],
    ['calorieIntake', 'adherence'], ['waterLiters', 'adherence'], ['dailySteps', 'adherence'],
    ['protein', 'adherence'], ['carbs', 'adherence'], ['fats', 'adherence'],
  ] as const)('blocks a missing %s at its step and at final submission', (field, step) => {
    const form = { ...COMPLETE_FORM, [field]: null };
    expect(validateCheckInStep(step, form)).toHaveProperty(field);
    expect(validateCheckIn(form)).toMatchObject({ step, errors: { [field]: expect.any(String) } });
  });

  it.each(['', '  \n '])('blocks blank notes even in a restored review draft (%j)', (notes) => {
    expect(validateCheckIn({ ...COMPLETE_FORM, notes })).toMatchObject({
      step: 'finish', errors: { notes: expect.any(String) },
    });
  });

  it('accepts explicitly recorded zero measurements without treating them as missing', () => {
    expect(validateCheckIn({ ...COMPLETE_FORM, sleepHours: 0, calorieIntake: 0,
      waterLiters: 0, dailySteps: 0, protein: 0, carbs: 0, fats: 0,
    })).toEqual({ step: null, errors: {} });
  });

  it.each(['protein', 'carbs', 'fats'] as const)('rejects invalid %s in restored drafts', (field) => {
    for (const value of [-1, NaN, Infinity]) {
      expect(validateCheckIn({ ...COMPLETE_FORM, [field]: value }).errors).toHaveProperty(field);
    }
  });

  it('requires performance only after training or cardio', () => {
    expect(validateCheckInStep('adherence', { ...EMPTY_FORM, workoutStatus: 'done' }))
      .toHaveProperty('workoutPerformance');
    expect(validateCheckInStep('adherence', { ...EMPTY_FORM, workoutStatus: 'rest_day' }))
      .not.toHaveProperty('workoutPerformance');
  });

  it.each([
    ['energyLevel', 'readiness'], ['stressLevel', 'recovery'], ['hungerLevel', 'recovery'],
    ['workoutPerformance', 'adherence'], ['nutritionScore', 'adherence'],
  ] as const)('requires an exact integer from 1 to 10 for restored %s', (field, step) => {
    const form = { ...COMPLETE_FORM, workoutStatus: 'done' as const, workoutPerformance: 7 };
    for (const value of [0, 11, 1.5, 9.9, NaN, Infinity]) {
      expect(validateCheckInStep(step, { ...form, [field]: value })).toHaveProperty(field);
      expect(validateCheckIn({ ...form, [field]: value })).toMatchObject({
        step, errors: { [field]: 'Choose a rating from 1 to 10.' },
      });
    }
    for (const value of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      expect(validateCheckIn({ ...form, [field]: value })).toEqual({ step: null, errors: {} });
    }
    expect(validateCheckIn({ ...form, [field]: null }).errors).toHaveProperty(field);
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
      sleepHours: 'Enter sleep between 0 and 24 hours.',
    });
    expect(validateCheckInStep('recovery', form)).toMatchObject({
      stressLevel: 'Choose a rating from 1 to 10.',
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
