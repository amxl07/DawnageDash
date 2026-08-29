import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useMemo } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { processCheckInHistory, type RawDailyCheckIn } from '@/lib/checkin-utils';
import { supabase } from '@/lib/supabase';
import { num } from '@/types/db';
import type { BodyMeasurement, DailyCheckIn } from '@/types/db';

/**
 * Port of client/src/hooks/useDashboardData.ts.
 * Formulas are verbatim per plans/01-data-contracts.md §"Key derived-metric formulas".
 * Impersonation dropped — mobile always acts as the signed-in user.
 */
export function useDashboardData() {
  const { user } = useAuth();
  const userId = user?.id;

  const checkInsQuery = useQuery({
    queryKey: ['dailyCheckIns', userId],
    queryFn: async (): Promise<DailyCheckIn[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('daily_check_ins')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as DailyCheckIn[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const measurementsQuery = useQuery({
    queryKey: ['bodyMeasurements', userId],
    queryFn: async (): Promise<BodyMeasurement[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as BodyMeasurement[];
    },
    enabled: !!userId,
  });

  const checkIns = checkInsQuery.data;

  const derived = useMemo(() => {
    const sorted = checkIns
      ? [...checkIns].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      : [];

    const metrics = {
      currentWeight: sorted.length ? num(sorted[sorted.length - 1]?.morning_weight) : 0,
      totalWorkouts: sorted.filter((c) => c.workout_status === 'done').length,
      avgNutritionScore: sorted.length
        ? (sorted.reduce((s, c) => s + (c.nutrition_score || 0), 0) / sorted.length).toFixed(1)
        : '0',
      avgEnergyLevel: sorted.length
        ? Math.round(sorted.reduce((s, c) => s + (c.energy_level || 0), 0) / sorted.length)
        : 0,
    };

    const processed = checkIns ? processCheckInHistory(checkIns as RawDailyCheckIn[]) : [];
    const last7Processed = processed.slice(0, 7).reverse();

    const last7Raw = sorted.slice(-7);
    const weightTrend =
      last7Raw.length >= 2
        ? num(last7Raw[last7Raw.length - 1].morning_weight) - num(last7Raw[0].morning_weight)
        : 0;

    const weightChartData = sorted
      .filter((c) => c.morning_weight && num(c.morning_weight) > 0)
      .map((c) => ({ label: format(new Date(c.date), 'MMM d'), value: num(c.morning_weight) }));

    // Missed days deliberately render as 0 — matching the web.
    const performanceChartData = last7Processed.map((c) => ({
      day: format(c.date, 'EEE'),
      performance: c.status === 'missed' ? 0 : c.originalCheckIn?.workout_performance || 0,
      nutrition: c.status === 'missed' ? 0 : c.originalCheckIn?.nutrition_score || 0,
      energy: c.status === 'missed' ? 0 : c.originalCheckIn?.energy_level || 0,
    }));

    const validNutritionLogs = (checkIns ?? [])
      .filter((c) => num(c.protein) > 0 || num(c.carbs) > 0 || num(c.fats) > 0)
      .slice(-7);
    const totals = validNutritionLogs.reduce(
      (acc, c) => ({
        protein: acc.protein + num(c.protein),
        carbs: acc.carbs + num(c.carbs),
        fats: acc.fats + num(c.fats),
      }),
      { protein: 0, carbs: 0, fats: 0 },
    );
    const n = validNutritionLogs.length || 1;
    const nutritionBreakdown = {
      protein: Math.round(totals.protein / n),
      carbs: Math.round(totals.carbs / n),
      fats: Math.round(totals.fats / n),
    };

    return { sorted, metrics, processed, weightTrend, weightChartData, performanceChartData, nutritionBreakdown };
  }, [checkIns]);

  return {
    checkIns,
    measurements: measurementsQuery.data,
    ...derived,
    isLoading: checkInsQuery.isLoading || measurementsQuery.isLoading,
    isError: checkInsQuery.isError || measurementsQuery.isError,
    refetch: () => {
      void checkInsQuery.refetch();
      void measurementsQuery.refetch();
    },
    isRefetching: checkInsQuery.isRefetching,
  };
}
