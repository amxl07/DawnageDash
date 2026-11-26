import type { CheckInStep } from './CheckInForm';

export const CHECK_IN_STAGE_META: Record<CheckInStep, { title: string }> = {
  readiness: {
    title: 'Morning',
  },
  recovery: {
    title: 'Your day',
  },
  adherence: {
    title: 'Training & nutrition',
  },
  finish: {
    title: 'Review',
  },
};

