import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function useDashboardData() {
  const { user } = useAuth();

  // Fetch daily check-ins
  const { data: checkIns, isLoading: checkInsLoading } = useQuery({
    queryKey: ['dailyCheckIns', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_check_ins')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch body measurements
  const { data: measurements, isLoading: measurementsLoading } = useQuery({
    queryKey: ['bodyMeasurements', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch workout plans
  const { data: workoutPlans, isLoading: workoutPlansLoading } = useQuery({
    queryKey: ['workoutPlans', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .order('day_of_week', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch meal plans
  const { data: mealPlans, isLoading: mealPlansLoading } = useQuery({
    queryKey: ['mealPlans', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .order('day_of_week', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Calculate derived metrics from check-ins
  const metrics = {
    currentWeight: checkIns?.[checkIns.length - 1]?.morning_weight || 0,
    totalWorkouts: checkIns?.filter(c => c.workout_status === 'done').length || 0,
    avgNutritionScore: checkIns?.length
      ? (checkIns.reduce((sum, c) => sum + (c.nutrition_score || 0), 0) / checkIns.length).toFixed(1)
      : '0',
    avgEnergyLevel: checkIns?.length
      ? Math.round(checkIns.reduce((sum, c) => sum + (c.energy_level || 0), 0) / checkIns.length)
      : 0,
  };

  // Get last 7 days of check-ins for trends
  const last7Days = checkIns?.slice(-7) || [];

  // Calculate weight trend
  const weightTrend = last7Days.length >= 2
    ? parseFloat(last7Days[0].morning_weight || '0') - parseFloat(last7Days[last7Days.length - 1].morning_weight || '0')
    : 0;

  // Transform check-ins data for charts
  const weightChartData = measurements?.map((m, index) => ({
    date: `W${index + 1}`,
    weight: parseFloat(m.weight || '0'),
  })) || [];

  const performanceChartData = last7Days.map(c => ({
    day: new Date(c.date).toLocaleDateString('en-US', { weekday: 'short' }),
    performance: c.workout_performance || 0,
    nutrition: c.nutrition_score || 0,
    energy: c.energy_level || 0,
  }));

  // Calculate daily nutrition breakdown (average or latest)
  const latestCheckIn = checkIns?.[checkIns.length - 1];
  const nutritionBreakdown = {
    protein: parseFloat(latestCheckIn?.protein || '0'),
    carbs: parseFloat(latestCheckIn?.carbs || '0'),
    fats: parseFloat(latestCheckIn?.fats || '0'),
  };

  return {
    checkIns,
    measurements,
    workoutPlans,
    mealPlans,
    metrics,
    weightTrend,
    weightChartData,
    performanceChartData,
    nutritionBreakdown,
    isLoading: checkInsLoading || measurementsLoading || workoutPlansLoading || mealPlansLoading,
  };
}
