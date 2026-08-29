import type { CheckInStep, FormState } from '@/components/checkin/CheckInForm';

type Errors = Partial<Record<keyof FormState, string>>;

const isOutside = (value: number | null, min: number, max: number) =>
  value !== null && (value < min || value > max);

const addRatingError = (errors: Errors, field: keyof FormState, value: number | null) => {
  if (value === null) return;
  if (isOutside(value, 1, 10)) errors[field] = 'Choose a rating from 1 to 10.';
};

export function validateCheckInStep(step: CheckInStep, form: FormState): Errors {
  const errors: Errors = {};

  if (step === 'readiness') {
    if (form.energyLevel === null) errors.energyLevel = 'Choose your energy level.';
    if (form.stressLevel === null) errors.stressLevel = 'Choose your stress level.';
    if (isOutside(form.morningWeight, 20, 400)) {
      errors.morningWeight = 'Enter a weight between 20 and 400 kg.';
    }
    addRatingError(errors, 'energyLevel', form.energyLevel);
    addRatingError(errors, 'stressLevel', form.stressLevel);
  }

  if (step === 'recovery') {
    if (form.sleepHours === null) errors.sleepHours = 'Add your sleep hours.';
    if (form.hungerLevel === null) errors.hungerLevel = 'Choose your hunger level.';
    if (form.digestion === null) errors.digestion = 'Choose your digestion status.';
    if (isOutside(form.sleepHours, 0, 24)) {
      errors.sleepHours = 'Enter sleep between 0 and 24 hours.';
    }
    addRatingError(errors, 'hungerLevel', form.hungerLevel);
  }

  if (step === 'adherence') {
    if (form.workoutStatus === null) errors.workoutStatus = 'Choose today’s training status.';
    if (form.nutritionScore === null) errors.nutritionScore = 'Choose your nutrition score.';
    if (form.workoutStatus === 'done' || form.workoutStatus === 'cardio_day') {
      if (form.workoutPerformance === null) {
        errors.workoutPerformance = 'Choose your workout performance.';
      }
      addRatingError(errors, 'workoutPerformance', form.workoutPerformance);
    }
    addRatingError(errors, 'nutritionScore', form.nutritionScore);
    if (isOutside(form.dailySteps, 0, 200000)) {
      errors.dailySteps = 'Enter steps between 0 and 200,000.';
    }
    if (isOutside(form.calorieIntake, 0, 20000)) {
      errors.calorieIntake = 'Enter calories between 0 and 20,000.';
    }
    if (isOutside(form.waterLiters, 0, 20)) {
      errors.waterLiters = 'Enter water between 0 and 20 L.';
    }
  }

  return errors;
}
