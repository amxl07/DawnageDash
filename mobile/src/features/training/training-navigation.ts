import type { Href } from 'expo-router';

export type TrainingView = 'plan' | 'history';
type RouteParam = string | string[] | undefined;

export function resolveTrainingView(value: RouteParam): TrainingView {
  const requested = Array.isArray(value) ? value[0] : value;
  return requested === 'history' ? 'history' : 'plan';
}

export function legacyLogsDestination(
  params: Record<string, RouteParam>,
): Href {
  const preserved = (['date', 'logId', 'outboxId'] as const).reduce<Record<string, string>>(
    (result, key) => {
      const value = params[key];
      const first = Array.isArray(value) ? value[0] : value;
      if (first !== undefined) result[key] = first;
      return result;
    },
    { view: 'history' },
  );

  return {
    pathname: '/(app)/(tabs)/plans',
    params: preserved,
  };
}
