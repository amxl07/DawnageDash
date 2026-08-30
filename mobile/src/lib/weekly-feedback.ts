import { WEEKLY_KEYS, WEEKLY_STEPS } from '@/components/weekly/steps';

export type WeeklyFeedbackForm = Record<string, string>;
export type WeeklyFeedbackErrors = Partial<Record<string, string>>;

export type WeeklyFeedbackDraft = {
  form: WeeklyFeedbackForm;
  step: number;
};

/** The columns that actually exist on public.weekly_check_ins. */
export type WeeklyCheckIn = {
  id: string;
  user_id: string;
  created_at: string | null;
  week_start_date: string | null;
  overall_feeling: string | null;
  weekly_wins: string | null;
  nutrition_adherence: string | null;
  digestion: string | null;
  enjoying_meals: string | null;
  hunger_levels: string | null;
  nutrition_questions: string | null;
  training_progress: string | null;
  enjoying_training: string | null;
  missed_sessions: string | null;
  joint_pain: string | null;
  step_count: string | null;
  training_questions: string | null;
  recovery_issues: string | null;
  water_intake: string | null;
  stress_level: string | null;
  overall_experience: string | null;
  feedback: string | null;
};

export function weeklyAnswer(row: WeeklyCheckIn, key: string): string | null {
  if (!WEEKLY_KEYS.includes(key)) return null;
  return row[key as keyof WeeklyCheckIn] ?? null;
}

export const weeklyDraftKey = (userId: string) => `weekly-feedback-draft:${userId}`;

export function boundWeeklyStep(step: unknown): number {
  if (typeof step !== 'number' || !Number.isFinite(step)) return 0;
  return Math.max(0, Math.min(WEEKLY_STEPS.length - 1, Math.trunc(step)));
}

export function normalizeWeeklyDraft(value: unknown): WeeklyFeedbackDraft | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { form?: unknown; step?: unknown };
  if (!candidate.form || typeof candidate.form !== 'object' || Array.isArray(candidate.form)) {
    return null;
  }

  const source = candidate.form as Record<string, unknown>;
  const form = Object.fromEntries(
    WEEKLY_KEYS.map((key) => [key, typeof source[key] === 'string' ? source[key] : '']),
  );

  return { form, step: boundWeeklyStep(candidate.step) };
}

/**
 * Validate only the step a person is currently completing. Every weekly
 * response remains optional; validation protects typed values and declared
 * option contracts without inventing new required fields.
 */
export function validateWeeklyStep(
  step: number,
  form: WeeklyFeedbackForm,
): WeeklyFeedbackErrors {
  const fields = WEEKLY_STEPS[step]?.fields ?? [];
  const errors: WeeklyFeedbackErrors = {};

  for (const field of fields) {
    const raw = form[field.key] ?? '';
    const value = raw.trim();
    if (!value) continue;

    if (field.type === 'radio' && !field.options?.includes(value)) {
      errors[field.key] = 'Choose one of the available options.';
      continue;
    }

    if (field.key === 'step_count') {
      const count = Number(value);
      if (!Number.isFinite(count) || count < 0 || !Number.isInteger(count)) {
        errors.step_count = 'Enter a step count of zero or more.';
      }
      continue;
    }

    if (field.key === 'water_intake') {
      const litres = Number(value);
      if (!Number.isFinite(litres) || litres < 0 || litres > 20) {
        errors.water_intake = 'Enter water between 0 and 20 litres.';
      }
      continue;
    }

    if (field.key === 'stress_level') {
      const stress = Number(value);
      if (!Number.isInteger(stress) || stress < 1 || stress > 10) {
        errors.stress_level = 'Choose a stress level from 1 to 10.';
      }
    }
  }

  return errors;
}
