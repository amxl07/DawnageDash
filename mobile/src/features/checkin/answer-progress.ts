import { CHECK_IN_FIELDS } from './config/fields';
import type { FormState } from './model';

export type AnswerProgress = { answered: number; total: number };

/** Presence only: the step and final validators still decide whether an answer is valid. */
export function answerProgress(form: FormState): AnswerProgress {
  const applicable = CHECK_IN_FIELDS.filter((field) =>
    !('showsWhen' in field) || field.showsWhen.in.some((value) => value === form[field.showsWhen.field]),
  );
  const answered = applicable.filter(({ id }) => {
    const value = form[id];
    return typeof value === 'number' ? Number.isFinite(value) : typeof value === 'string' && value.trim().length > 0;
  }).length;
  return { answered, total: applicable.length };
}
