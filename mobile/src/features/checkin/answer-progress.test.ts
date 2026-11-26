import { validateCheckIn } from '@/lib/checkin-validation';
import { answerProgress } from './answer-progress';
import { EMPTY_FORM, type FormState } from './model';

const complete: FormState = {
  morningWeight: 72.4, sleepHours: 7, energyLevel: 6,
  stressLevel: 3, hungerLevel: 5, digestion: 'none',
  workoutStatus: 'rest_day', workoutPerformance: null, nutritionScore: 8,
  calorieIntake: 2200, waterLiters: 2.25, dailySteps: 8200,
  protein: 140, carbs: 260, fats: 60, notes: 'Rest day.',
};

describe('answerProgress', () => {
  it('counts only applicable answers and adds performance when training is selected', () => {
    expect(answerProgress(EMPTY_FORM)).toEqual({ answered: 0, total: 15 });
    expect(answerProgress({ ...EMPTY_FORM, workoutStatus: 'done' })).toEqual({ answered: 1, total: 16 });
    expect(answerProgress({ ...complete, workoutStatus: 'cardio_day' })).toEqual({ answered: 15, total: 16 });
    expect(answerProgress({ ...complete, workoutStatus: 'cardio_day', workoutPerformance: 7 })).toEqual({ answered: 16, total: 16 });
    expect(answerProgress({ ...complete, workoutPerformance: 7 })).toEqual({ answered: 15, total: 15 });
  });

  it('counts deliberate zeros and Normal digestion, but not whitespace notes', () => {
    expect(answerProgress({ ...complete, sleepHours: 0, calorieIntake: 0, waterLiters: 0,
      dailySteps: 0, protein: 0, carbs: 0, fats: 0, notes: ' \n ' })).toEqual({ answered: 14, total: 15 });
  });

  it('does not present answered as a guarantee that values are valid', () => {
    const invalid = { ...complete, morningWeight: 500 };
    expect(answerProgress(invalid)).toEqual({ answered: 15, total: 15 });
    expect(validateCheckIn(invalid).errors.morningWeight).toBeDefined();
    expect(answerProgress({ ...complete, morningWeight: NaN })).toEqual({ answered: 14, total: 15 });
  });
});
