import type { CheckInStep } from './CheckInForm';

export const CHECK_IN_DAILY_PROMPTS = [
  'A quick honest check-in is enough.',
  'Small signals help your coach see the full week.',
  'Take a breath, then capture today as it is.',
  'Consistency matters more than a perfect day.',
  'A minute now makes your next plan more personal.',
  'Notice the day. Record it. Keep moving.',
  'Your daily signal helps reveal the trend.',
] as const;

export const CHECK_IN_STAGE_META: Record<CheckInStep, { title: string; description: string }> = {
  readiness: {
    title: 'Readiness and energy',
    description: 'A quick picture of how you are starting today.',
  },
  recovery: {
    title: 'Sleep and recovery',
    description: 'Capture sleep and the context that affects recovery.',
  },
  adherence: {
    title: 'Nutrition and adherence',
    description: 'Record training and the useful nutrition numbers.',
  },
  finish: {
    title: 'Notes and confirmation',
    description: 'Review your check-in before saving it.',
  },
};

export function getCheckInDailyPrompt(date: string): string {
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  const index = ((day % CHECK_IN_DAILY_PROMPTS.length) + CHECK_IN_DAILY_PROMPTS.length)
    % CHECK_IN_DAILY_PROMPTS.length;

  return CHECK_IN_DAILY_PROMPTS[index];
}
