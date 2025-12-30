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
        .order('day_of_week', { ascending: true });

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

  // Process check-ins to identify missed days
  const processedCheckIns = checkIns ? processCheckInHistory(checkIns) : [];

  // Get last 7 days from the *processed* history to include missed days
  // processedCheckIns is typically returned newest first by the utility
  const last7DaysProcessed = processedCheckIns.slice(0, 7).reverse();

  // Calculate weight trend (still using actual check-ins for weight delta)
  // We need to find the latest and oldest weight within the range, but simple method:
  const last7DaysRaw = checkIns?.slice(-7) || [];
  const weightTrend = last7DaysRaw.length >= 2
    ? parseFloat(last7DaysRaw[0].morning_weight || '0') - parseFloat(last7DaysRaw[last7DaysRaw.length - 1].morning_weight || '0')
    : 0;

  // Transform check-ins data for charts
  const weightChartData = measurements?.map((m, index) => ({
    date: `W${index + 1}`,
    weight: parseFloat(m.weight || '0'),
  })) || [];

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
