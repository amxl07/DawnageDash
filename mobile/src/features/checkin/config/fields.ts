import type { FormState } from '@/components/checkin/CheckInForm';
import type { CheckInPayload } from '@/hooks/useCheckInMutation';

export type CheckInFieldId = keyof FormState;
export type CheckInSectionId = 'readiness' | 'recovery' | 'adherence' | 'finish';
export type CheckInControl = 'ruler' | 'rating' | 'pills' | 'number' | 'text';

export type CheckInFieldDef = {
  id: CheckInFieldId;
  payloadKey: keyof CheckInPayload;
  section: CheckInSectionId;
  label: string;
  control: CheckInControl;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  carryForward: boolean;
  options?: readonly { value: string; label: string }[];
  showsWhen?: { field: CheckInFieldId; in: readonly string[] };
};

/**
 * The UI registry mirrors the production payload one-for-one. Keep field IDs,
 * payload keys, and enum values aligned with FormState and daily_check_ins.
 */
export const CHECK_IN_FIELDS = [
  { id: 'morningWeight', payloadKey: 'morning_weight', section: 'readiness', label: 'Morning weight', control: 'ruler', unit: 'kg', min: 20, max: 400, step: 0.1, precision: 1, carryForward: true },
  { id: 'energyLevel', payloadKey: 'energy_level', section: 'readiness', label: 'Energy', control: 'rating', min: 1, max: 10, step: 1, precision: 0, carryForward: false },
  { id: 'stressLevel', payloadKey: 'stress_level', section: 'readiness', label: 'Stress', control: 'rating', min: 1, max: 10, step: 1, precision: 0, carryForward: false },
  { id: 'sleepHours', payloadKey: 'sleep_hours', section: 'recovery', label: 'Sleep', control: 'ruler', unit: 'h', min: 0, max: 24, step: 0.5, precision: 1, carryForward: true },
  { id: 'hungerLevel', payloadKey: 'hunger_level', section: 'recovery', label: 'Hunger', control: 'rating', min: 1, max: 10, step: 1, precision: 0, carryForward: false },
  {
    id: 'digestion', payloadKey: 'digestion', section: 'recovery', label: 'Digestion', control: 'pills', carryForward: false,
    options: [
      { value: 'none', label: 'Normal' },
      { value: 'bloated', label: 'Bloated' },
      { value: 'constipated', label: 'Constipated' },
      { value: 'diarrhea', label: 'Diarrhea' },
    ],
  },
  {
    id: 'workoutStatus', payloadKey: 'workout_status', section: 'adherence', label: 'Workout', control: 'pills', carryForward: false,
    options: [
      { value: 'done', label: 'Done' },
      { value: 'no', label: 'No' },
      { value: 'cardio_day', label: 'Cardio' },
      { value: 'rest_day', label: 'Rest' },
    ],
  },
  { id: 'workoutPerformance', payloadKey: 'workout_performance', section: 'adherence', label: 'How did it go?', control: 'rating', min: 1, max: 10, step: 1, precision: 0, carryForward: false, showsWhen: { field: 'workoutStatus', in: ['done', 'cardio_day'] } },
  { id: 'nutritionScore', payloadKey: 'nutrition_score', section: 'adherence', label: 'Nutrition score', control: 'rating', min: 1, max: 10, step: 1, precision: 0, carryForward: false },
  { id: 'calorieIntake', payloadKey: 'calorie_intake', section: 'adherence', label: 'Calories', control: 'number', unit: 'kcal', min: 0, max: 20000, step: 1, precision: 0, carryForward: true },
  { id: 'waterLiters', payloadKey: 'water_liters', section: 'adherence', label: 'Water', control: 'ruler', unit: 'L', min: 0, max: 20, step: 0.25, precision: 2, carryForward: true },
  { id: 'dailySteps', payloadKey: 'daily_steps', section: 'adherence', label: 'Steps', control: 'number', unit: 'steps', min: 0, max: 200000, step: 1, precision: 0, carryForward: true },
  { id: 'protein', payloadKey: 'protein', section: 'adherence', label: 'Protein', control: 'number', unit: 'g', min: 0, step: 1, precision: 0, carryForward: true },
  { id: 'carbs', payloadKey: 'carbs', section: 'adherence', label: 'Carbs', control: 'number', unit: 'g', min: 0, step: 1, precision: 0, carryForward: true },
  { id: 'fats', payloadKey: 'fats', section: 'adherence', label: 'Fats', control: 'number', unit: 'g', min: 0, step: 1, precision: 0, carryForward: true },
  { id: 'notes', payloadKey: 'notes', section: 'finish', label: 'Notes (optional)', control: 'text', carryForward: false },
] as const satisfies readonly CheckInFieldDef[];

export type NumericHistoryFieldId = Extract<
  (typeof CHECK_IN_FIELDS)[number],
  { control: 'ruler' | 'rating' | 'number' }
>['id'];

