export type PrimaryGoal = 'fat_loss' | 'muscle_gain' | 'performance' | 'consistency';
export type StartPreference = 'start_now' | 'wait_for_coach';
export type SetupValues = { primaryGoal: PrimaryGoal | null; timezone: string; startPreference: StartPreference | null };
export type SetupStageIndex = 0 | 1 | 2;
export const GOAL_LABELS: Record<PrimaryGoal, string> = { fat_loss: 'Fat loss', muscle_gain: 'Build muscle', performance: 'Performance', consistency: 'Consistency' };

export function hydrateSetup(data: Record<string, unknown> | null | undefined, fallbackTimezone: string): SetupValues {
  const primaryGoal = data?.primary_goal;
  return {
    primaryGoal: typeof primaryGoal === 'string' && Object.hasOwn(GOAL_LABELS, primaryGoal) ? primaryGoal as PrimaryGoal : null,
    timezone: typeof data?.timezone === 'string' && data.timezone ? data.timezone : fallbackTimezone,
    startPreference: data?.start_preference === 'start_now' || data?.start_preference === 'wait_for_coach' ? data.start_preference : null,
  };
}

export function setupDestination(preference: StartPreference | null) {
  return preference === 'start_now' ? '/(app)/(tabs)/check-in' as const : '/(app)/(tabs)' as const;
}

export function nextSetupMilestone(acknowledged: number, stage: SetupStageIndex): number {
  return Math.max(acknowledged, stage + 1);
}
