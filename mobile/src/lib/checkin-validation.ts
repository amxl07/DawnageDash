import type { CheckInStep, FormState } from '@/components/checkin/CheckInForm';

type Errors = Partial<Record<keyof FormState, string>>;

const WORKOUT_STATUSES = ['done', 'no', 'cardio_day', 'rest_day'] as const;
const DIGESTION_STATUSES = ['none', 'bloated', 'constipated', 'diarrhea'] as const;
const VALIDATION_STEPS: Exclude<CheckInStep, 'finish'>[] = ['readiness', 'recovery', 'adherence'];

const isOutside = (value: number | null, min: number, max: number) =>
  value !== null && (!Number.isFinite(value) || value < min || value > max);

const isWorkoutStatus = (value: unknown): value is (typeof WORKOUT_STATUSES)[number] =>
  typeof value === 'string' && WORKOUT_STATUSES.includes(value as (typeof WORKOUT_STATUSES)[number]);

const isDigestion = (value: unknown): value is (typeof DIGESTION_STATUSES)[number] =>
  typeof value === 'string' && DIGESTION_STATUSES.includes(value as (typeof DIGESTION_STATUSES)[number]);

export const requiresWorkoutPerformance = (status: unknown) =>
  status === 'done' || status === 'cardio_day';

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
    if (!isDigestion(form.digestion)) errors.digestion = 'Choose your digestion status.';
    if (isOutside(form.sleepHours, 0, 24)) {
      errors.sleepHours = 'Enter sleep between 0 and 24 hours.';
    }
    addRatingError(errors, 'hungerLevel', form.hungerLevel);
  }

  if (step === 'adherence') {
    if (!isWorkoutStatus(form.workoutStatus)) errors.workoutStatus = 'Choose today’s training status.';
    if (form.nutritionScore === null) errors.nutritionScore = 'Choose your nutrition score.';
    if (requiresWorkoutPerformance(form.workoutStatus)) {
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

/** Validates every editable step so a restored Finish draft cannot bypass it. */
export function validateCheckIn(form: FormState): { step: Exclude<CheckInStep, 'finish'> | null; errors: Errors } {
  const errors: Errors = {};
  let step: Exclude<CheckInStep, 'finish'> | null = null;
  for (const candidate of VALIDATION_STEPS) {
    const stepErrors = validateCheckInStep(candidate, form);
    if (step === null && Object.keys(stepErrors).length > 0) step = candidate;
    Object.assign(errors, stepErrors);
  }
  return { step, errors };
}
