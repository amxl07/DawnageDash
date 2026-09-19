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

export const CHECK_IN_STAGE_META: Record<CheckInStep, { title: string }> = {
  readiness: {
    title: 'Readiness',
  },
  recovery: {
    title: 'Recovery',
  },
  adherence: {
    title: 'Training & nutrition',
  },
  finish: {
    title: 'Review',
  },
};

export function getCheckInDailyPrompt(date: string): string {
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  const index = ((day % CHECK_IN_DAILY_PROMPTS.length) + CHECK_IN_DAILY_PROMPTS.length)
    % CHECK_IN_DAILY_PROMPTS.length;

  return CHECK_IN_DAILY_PROMPTS[index];
}
