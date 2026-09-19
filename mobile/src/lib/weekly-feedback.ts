import { WEEKLY_KEYS, WEEKLY_STEPS } from '@/components/weekly/steps';
import { isDateKeyStrict, localDateString, parseLocalDate } from '@/lib/dates';

export type WeeklyFeedbackForm = Record<string, string>;
export type WeeklyFeedbackErrors = Partial<Record<string, string>>;

export const WEEKLY_PREFILL_KEYS = ['step_count', 'water_intake', 'stress_level'] as const;
export type WeeklyPrefillKey = (typeof WEEKLY_PREFILL_KEYS)[number];

/** Serialized context for an account-owned report; dates never advance on resume. */
export type WeeklyReportSnapshot = {
  through: string;
  prefill: Record<WeeklyPrefillKey, string>;
  observationDates: Record<WeeklyPrefillKey, string[]>;
  /** Older drafts did not record their reporting date or observation sources. */
  inferred?: boolean;
};

export type WeeklyFeedbackDraft = {
  form: WeeklyFeedbackForm;
  step: number;
  report?: WeeklyReportSnapshot;
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

export function weeklyAnswer(row: WeeklyCheckIn | WeeklyFeedbackForm, key: string): string | null {
  if (!WEEKLY_KEYS.includes(key)) return null;
  return row[key as keyof WeeklyCheckIn] ?? null;
}

export const weeklyDraftKey = (userId: string) => `weekly-feedback-draft:${userId}`;

export function boundWeeklyStep(step: unknown): number {
  if (typeof step !== 'number' || !Number.isFinite(step)) return 0;
  return Math.max(0, Math.min(WEEKLY_STEPS.length - 1, Math.trunc(step)));
}

/** Same device-local calendar convention used by daily check-ins. */
export function weeklyReportingWindow(today: string) {
  const monday = parseLocalDate(today);
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  return { from: localDateString(monday), to: today };
}

export function normalizeWeeklyReport(value: unknown): WeeklyReportSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.through !== 'string' || !isDateKeyStrict(candidate.through)) return undefined;
  const { from, to } = weeklyReportingWindow(candidate.through);
  const prefill = candidate.prefill && typeof candidate.prefill === 'object' ? candidate.prefill as Record<string, unknown> : {};
  const dates = candidate.observationDates && typeof candidate.observationDates === 'object' ? candidate.observationDates as Record<string, unknown> : {};
  return {
    through: to,
    prefill: Object.fromEntries(WEEKLY_PREFILL_KEYS.map((key) => [key, typeof prefill[key] === 'string' ? prefill[key] : ''])) as Record<WeeklyPrefillKey, string>,
    observationDates: Object.fromEntries(WEEKLY_PREFILL_KEYS.map((key) => [key,
      Array.isArray(dates[key]) ? (dates[key] as unknown[]).filter((date): date is string => typeof date === 'string' && isDateKeyStrict(date) && date >= from && date <= to).sort() : [],
    ])) as Record<WeeklyPrefillKey, string[]>,
    ...(candidate.inferred === true ? { inferred: true } : {}),
  };
}

export function normalizeWeeklyDraft(value: unknown): WeeklyFeedbackDraft | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { form?: unknown; step?: unknown; report?: unknown };
  if (!candidate.form || typeof candidate.form !== 'object' || Array.isArray(candidate.form)) {
    return null;
  }

  const source = candidate.form as Record<string, unknown>;
  const form = Object.fromEntries(
    WEEKLY_KEYS.map((key) => [key, typeof source[key] === 'string' ? source[key] : '']),
  );

  const report = normalizeWeeklyReport(candidate.report);
  return { form, step: boundWeeklyStep(candidate.step), ...(report ? { report } : {}) };
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
