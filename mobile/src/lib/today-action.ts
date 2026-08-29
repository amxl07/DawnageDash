import type { Href } from 'expo-router';

export type TodayActionKind = 'check-in' | 'review-update' | 'open-plan' | 'review-progress';

export type TodayAction = {
  kind: TodayActionKind;
  title: string;
  detail: string;
  route: Href;
};

export function resolveTodayAction(input: {
  checkedInToday: boolean;
  hasWorkoutPlan: boolean;
  planChanged: boolean;
}): TodayAction {
  if (!input.checkedInToday) {
    return {
      kind: 'check-in',
      title: 'Complete today’s check-in',
      detail: 'A few minutes keeps your coach up to date.',
      route: '/(app)/(tabs)/check-in',
    };
  }

  if (input.planChanged) {
    return {
      kind: 'review-update',
      title: 'Review your updated plan',
      detail: 'Your coach changed your training plan.',
      route: '/(app)/(tabs)/plans',
    };
  }

  if (input.hasWorkoutPlan) {
    return {
      kind: 'open-plan',
      title: 'Open your training plan',
      detail: 'Choose today’s session when you are ready.',
      route: '/(app)/(tabs)/plans',
    };
  }

  return {
    kind: 'review-progress',
    title: 'Review your progress',
    detail: 'See the patterns from your latest check-ins.',
    route: '/(app)/measurements',
  };
}
