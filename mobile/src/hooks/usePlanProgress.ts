import { endOfWeek, startOfWeek } from 'date-fns';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { localDateString } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { parseWorkoutContent } from '@/lib/workout-content';
import { readWorkoutDraft, type DraftData } from './useWorkoutDraft';
import type { PlanDay } from './usePlans';

export type PlanDayStatus = 'today' | 'active' | 'complete' | 'upcoming';

type PlanProgress = {
  activeDay: number | null;
  completedDays: readonly number[];
};

type WorkoutLogContent = { content: unknown };

const validPlanDay = (value: number): boolean => Number.isInteger(value) && value > 0;

export function completedPlanDaysFromLogs(logs: readonly WorkoutLogContent[]): number[] {
  const completed = new Set<number>();
  for (const log of logs) {
    const parsed = parseWorkoutContent(log.content);
    if (
      parsed.kind === 'exercises' &&
      parsed.version === 2 &&
      parsed.planDayNumber !== null &&
      parsed.planDayNumber !== undefined &&
      validPlanDay(parsed.planDayNumber)
    ) {
      completed.add(parsed.planDayNumber);
    }
  }
  return [...completed];
}

export function planDayNumberFromDraft(draft: DraftData | null): number | null {
  if (!draft) return null;
  const day = Number(draft.selectedPlanId);
  return validPlanDay(day) ? day : null;
}

export function derivePlanDayStatuses(
  dayNumbers: readonly number[],
  progress: PlanProgress,
): Record<number, PlanDayStatus> {
  const planDays = [...new Set(dayNumbers.filter(validPlanDay))];
  const planDaySet = new Set(planDays);
  const completedDays = new Set(
    progress.completedDays.filter((day) => planDaySet.has(day)),
  );
  const activeDay = progress.activeDay !== null && planDaySet.has(progress.activeDay)
    ? progress.activeDay
    : null;
  const today = activeDay === null
    ? planDays.find((day) => !completedDays.has(day)) ?? null
    : null;

  return Object.fromEntries(
    planDays.map((day) => {
      if (day === activeDay) return [day, 'active'];
      if (completedDays.has(day)) return [day, 'complete'];
      if (day === today) return [day, 'today'];
      return [day, 'upcoming'];
    }),
  ) as Record<number, PlanDayStatus>;
}

export function usePlanProgress(days: readonly PlanDay[]) {
  const { user } = useAuth();
  const today = localDateString();
  const weekStart = localDateString(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekEnd = localDateString(endOfWeek(new Date(), { weekStartsOn: 1 }));

  const query = useQuery({
    queryKey: ['workoutLogs', user?.id, 'plan-progress', weekStart],
    queryFn: async (): Promise<PlanProgress> => {
      if (!user?.id) return { activeDay: null, completedDays: [] };

      const [logsResult, draft] = await Promise.all([
        supabase
          .from('workout_logs')
          .select('content')
          .eq('user_id', user.id)
          .gte('date', weekStart)
          .lte('date', weekEnd),
        readWorkoutDraft(user.id, today),
      ]);
      if (logsResult.error) throw logsResult.error;

      return {
        activeDay: planDayNumberFromDraft(draft),
        completedDays: completedPlanDaysFromLogs(logsResult.data ?? []),
      };
    },
    enabled: Boolean(user?.id),
  });

  const dayNumbers = days.map((day) => day.day_number);
  const progress = query.data ?? { activeDay: null, completedDays: [] };
  const statuses = derivePlanDayStatuses(dayNumbers, progress);

  return { ...query, statuses };
}
