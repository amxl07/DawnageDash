import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { processCheckInHistory } from '@/lib/checkin-utils';
import { format } from 'date-fns';

export function useDashboardData() {
  const { user, viewedUserId } = useAuth();

  // Use the viewed user ID if available, otherwise fallback to the authenticated user ID
  const targetUserId = viewedUserId || user?.id;

  // Fetch daily check-ins
  const { data: checkIns, isLoading: checkInsLoading } = useQuery({
    queryKey: ['dailyCheckIns', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];

      const { data, error } = await supabase
        .from('daily_check_ins')
        .select('*')
        .eq('user_id', targetUserId) // Explicitly filter by targetUserId
        .order('date', { ascending: true });

      if (error) {
        console.error('Check-ins fetch error:', error);
        return []; // Return empty array instead of throwing
      }
      return data || [];
    },
    enabled: !!targetUserId,
    retry: false, // Don't retry on failure
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch body measurements
  const { data: measurements, isLoading: measurementsLoading } = useQuery({
    queryKey: ['bodyMeasurements', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];

      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', targetUserId)
        .order('date', { ascending: true });

      if (error) {
        console.error('Measurements fetch error:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!targetUserId,
    retry: false,
  });

  // Fetch workout plans
  const { data: workoutPlans, isLoading: workoutPlansLoading } = useQuery({
    queryKey: ['workoutPlans', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];

      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', targetUserId)
        .order('day_number', { ascending: true });

      if (error) {
        console.error('Workout plans fetch error:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!targetUserId,
    retry: false,
  });

  // Fetch meal plans
  const { data: mealPlans, isLoading: mealPlansLoading } = useQuery({
    queryKey: ['mealPlans', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];

      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', targetUserId)
        .order('day_of_week', { ascending: true });

      if (error) {
        console.error('Meal plans fetch error:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!targetUserId,
    retry: false,
  });

  // Transform check-ins data for charts
  // Explicitly sort by date to guarantee chronological order (Oldest -> Newest)
  // This is necessary because CheckIns.tsx shares the same query key with a different sort order
  const sortedCheckIns = checkIns ? [...checkIns].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) : [];

  // Calculate derived metrics from sorted check-ins (sort-order-independent)
  const metrics = {
    currentWeight: sortedCheckIns.length > 0 ? sortedCheckIns[sortedCheckIns.length - 1]?.morning_weight || 0 : 0,
    totalWorkouts: sortedCheckIns.filter(c => c.workout_status === 'done').length || 0,
    avgNutritionScore: sortedCheckIns.length
      ? (sortedCheckIns.reduce((sum, c) => sum + (c.nutrition_score || 0), 0) / sortedCheckIns.length).toFixed(1)
      : '0',
    avgEnergyLevel: sortedCheckIns.length
      ? Math.round(sortedCheckIns.reduce((sum, c) => sum + (c.energy_level || 0), 0) / sortedCheckIns.length)
      : 0,
  };

  // Process check-ins to identify missed days
  const processedCheckIns = checkIns ? processCheckInHistory(checkIns) : [];

  // Get last 7 days from the *processed* history to include missed days
  // processedCheckIns is typically returned newest first by the utility
  const last7DaysProcessed = processedCheckIns.slice(0, 7).reverse();

  // Calculate weight trend using explicitly sorted data (newest - oldest of last 7)
  const last7DaysRaw = sortedCheckIns.slice(-7);
  const weightTrend = last7DaysRaw.length >= 2
    ? parseFloat(last7DaysRaw[last7DaysRaw.length - 1].morning_weight || '0') - parseFloat(last7DaysRaw[0].morning_weight || '0')
    : 0;

  const weightChartData = sortedCheckIns
    .filter(c => c.morning_weight && parseFloat(c.morning_weight) > 0)
    .map(c => ({
      date: format(new Date(c.date), 'MMM d'),
      weight: parseFloat(c.morning_weight || '0'),
    }));

  const performanceChartData = last7DaysProcessed.map(c => {
    if (c.status === 'missed') {
      return {
        day: format(new Date(c.date), 'EEE'),
        performance: 0,
        nutrition: 0,
        energy: 0,
      };
    }
    return {
      day: format(new Date(c.date), 'EEE'),
      performance: c.originalCheckIn?.workout_performance || 0,
      nutrition: c.originalCheckIn?.nutrition_score || 0,
      energy: c.originalCheckIn?.energy_level || 0,
    };
  });

  // Calculate daily nutrition breakdown (average of last 7 valid logs)
  const validNutritionLogs = checkIns?.filter(c =>
    (c.protein && parseFloat(c.protein) > 0) ||
    (c.carbs && parseFloat(c.carbs) > 0) ||
    (c.fats && parseFloat(c.fats) > 0)
  ).slice(-7) || [];

  const avgNutrition = validNutritionLogs.reduce((acc, c) => ({
    protein: acc.protein + parseFloat(c.protein || '0'),
    carbs: acc.carbs + parseFloat(c.carbs || '0'),
    fats: acc.fats + parseFloat(c.fats || '0'),
  }), { protein: 0, carbs: 0, fats: 0 });

  const count = validNutritionLogs.length || 1;
  const nutritionBreakdown = {
    protein: Math.round(avgNutrition.protein / count),
    carbs: Math.round(avgNutrition.carbs / count),
    fats: Math.round(avgNutrition.fats / count),
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
