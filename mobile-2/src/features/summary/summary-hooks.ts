import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useFitnessRepository } from '@/data/repository-context';
import type { DailySummary } from '@/domain/models';
import { formatDate } from '@/domain/date';
import { getQueryNetworkMode } from '@/query/query-network-mode';
import { useSession } from '@/session/session-context';

export const dailySummaryQueryKey = (date: string) => ['daily-summary', date] as const;
export const mealTypesQueryKey = ['meal-types'] as const;

export function getSummaryCalorieStatus(summary: DailySummary) {
  const remaining = Math.max(summary.calories.goal - summary.calories.consumed, 0);

  return {
    goal: summary.calories.goal,
    isOverGoal: summary.calories.consumed > summary.calories.goal,
    remaining,
  };
}

export function useDailySummary(date: string) {
  const repository = useFitnessRepository();
  const { session } = useSession();

  return useQuery({
    networkMode: getQueryNetworkMode(session?.mode ?? 'connected'),
    queryFn: () => repository.getDailySummary(date),
    queryKey: dailySummaryQueryKey(date),
  });
}

export function useMealTypes() {
  const repository = useFitnessRepository();
  const { session } = useSession();

  return useQuery({
    networkMode: getQueryNetworkMode(session?.mode ?? 'connected'),
    queryFn: () => repository.getMealTypes(),
    queryKey: mealTypesQueryKey,
    staleTime: 1000 * 60 * 60,
  });
}

export function useSevenDaySummaries(endDate: Date = new Date()) {
  const repository = useFitnessRepository();
  const { session } = useSession();
  const endDateKey = formatDate(endDate);
  const dates = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${endDateKey}T12:00:00`);
    date.setDate(date.getDate() - (6 - index));
    return formatDate(date);
  }), [endDateKey]);

  const results = useQueries({
    queries: dates.map((date) => ({
      networkMode: getQueryNetworkMode(session?.mode ?? 'connected'),
      queryFn: () => repository.getDailySummary(date),
      queryKey: dailySummaryQueryKey(date),
    })),
  });

  return { dates, results };
}
