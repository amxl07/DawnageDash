import { emptyWeekly } from '@/components/weekly/steps';

import { normalizeWeeklyDraft, validateWeeklyStep, weeklyDraftKey } from './weekly-feedback';

describe('validateWeeklyStep', () => {
  it('rejects invalid numeric values without changing optional text fields', () => {
    expect(validateWeeklyStep(2, { ...emptyWeekly(), step_count: '-1' })).toEqual({
      step_count: 'Enter a step count of zero or more.',
    });
    expect(
      validateWeeklyStep(3, {
        ...emptyWeekly(),
        water_intake: '25',
        stress_level: '11',
      }),
    ).toEqual({
      water_intake: 'Enter water between 0 and 20 litres.',
      stress_level: 'Choose a stress level from 1 to 10.',
    });
  });

  it('accepts blank optional responses on every step', () => {
    const form = emptyWeekly();

    expect(validateWeeklyStep(0, form)).toEqual({});
    expect(validateWeeklyStep(1, form)).toEqual({});
    expect(validateWeeklyStep(2, form)).toEqual({});
    expect(validateWeeklyStep(3, form)).toEqual({});
    expect(validateWeeklyStep(4, form)).toEqual({});
  });

  it('accepts only the radio values declared by the active step', () => {
    expect(
      validateWeeklyStep(1, {
        ...emptyWeekly(),
        nutrition_adherence: 'Mostly',
        enjoying_meals: 'Yes',
        hunger_levels: 'Cravings',
      }),
    ).toEqual({});

    expect(
      validateWeeklyStep(1, {
        ...emptyWeekly(),
        nutrition_adherence: 'Sometimes',
        enjoying_meals: 'Maybe',
        hunger_levels: 'Fine',
      }),
    ).toEqual({
      nutrition_adherence: 'Choose one of the available options.',
      enjoying_meals: 'Choose one of the available options.',
      hunger_levels: 'Choose one of the available options.',
    });
  });

  it('rejects non-numeric values and accepts inclusive numeric boundaries', () => {
    expect(
      validateWeeklyStep(2, { ...emptyWeekly(), step_count: 'five thousand' }),
    ).toEqual({ step_count: 'Enter a step count of zero or more.' });
    expect(
      validateWeeklyStep(3, { ...emptyWeekly(), water_intake: 'a lot', stress_level: '4.5' }),
    ).toEqual({
      water_intake: 'Enter water between 0 and 20 litres.',
      stress_level: 'Choose a stress level from 1 to 10.',
    });
    expect(
      validateWeeklyStep(3, { ...emptyWeekly(), water_intake: '20', stress_level: '10' }),
    ).toEqual({});
  });

  it('creates a user-scoped draft key', () => {
    expect(weeklyDraftKey('user-42')).toBe('weekly-feedback-draft:user-42');
  });
});

it('retains a report snapshot while preserving legacy draft normalization', () => {
  const report = { through: '2026-09-20', prefill: { step_count: '8000', water_intake: '', stress_level: '' }, observationDates: { step_count: ['2026-09-20'], water_intake: [], stress_level: [] } };
  expect(normalizeWeeklyDraft({ form: { step_count: '8000' }, step: 2, report })?.report).toEqual(report);
  expect(normalizeWeeklyDraft({ form: { feedback: 'Legacy answer' }, step: 4 })).toEqual({ form: { ...emptyWeekly(), feedback: 'Legacy answer' }, step: 4 });
  expect(normalizeWeeklyDraft({ form: { feedback: 'Keep this' }, step: 4, report: { through: 'invalid' } })?.form.feedback).toBe('Keep this');
});
