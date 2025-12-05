import { DailyCheckInCard } from "@/components/DailyCheckInCard";
import { CheckInTrendsChart } from "@/components/CheckInTrendsChart";
import { MetricCard } from "@/components/MetricCard";
import { Card } from "@/components/ui/card";
import { Activity, TrendingDown, TrendingUp, Award } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export default function CheckIns() {
  const { user } = useAuth();

  // Fetch check-ins from Supabase
  const { data: checkIns, isLoading } = useQuery({
    queryKey: ['dailyCheckIns', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_check_ins')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Transform check-ins for the card display
  const checkInHistory = checkIns?.map((checkIn, index) => {
    const prevWeight = checkIns[index + 1]?.morning_weight || checkIn.morning_weight;
    const weightChange = checkIn.morning_weight
      ? parseFloat(checkIn.morning_weight) - parseFloat(prevWeight || checkIn.morning_weight)
      : 0;

    // Calculate day number if missing (assuming checkIns are sorted descending by date)
    // If checkIns are Newest First, then the oldest checkIn is at index checkIns.length - 1 (Day 1)
    // So current checkIn day number = total - index
    const calculatedDayNumber = checkIns.length - index;
    const displayDayNumber = checkIn.day_number || calculatedDayNumber;

    return {
      date: new Date(checkIn.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      dayNumber: displayDayNumber,
      vitals: {
        morningWeight: parseFloat(checkIn.morning_weight || '0'),
        sleepHours: parseFloat(checkIn.sleep_hours || '0'),
        weightChange: weightChange,
      },
      workout: {
        status: (() => {
          const status = (checkIn.workout_status || '').toLowerCase().trim();
          if (status === 'done' || status === 'completed' || status === 'yes') return 'done';
          if (status === 'cardio_day' || status === 'cardio') return 'cardio_day';
          if (status === 'rest_day' || status === 'rest') return 'rest_day';
          return 'no';
        })() as 'done' | 'no' | 'cardio_day' | 'rest_day',
        performance: checkIn.workout_performance || undefined,
      },
      nutrition: {
        score: checkIn.nutrition_score || 0,
        calorieIntake: checkIn.calorie_intake || 0,
        waterLiters: parseFloat(checkIn.water_liters || '0'),
        dailySteps: checkIn.daily_steps || 0,
      },
      wellbeing: {
        energyLevel: checkIn.energy_level || 0,
        hungerLevel: checkIn.hunger_level || 0,
        stressLevel: checkIn.stress_level || 0,
        digestion: (checkIn.digestion || 'none') as 'none' | 'bloated' | 'constipated' | 'diarrhea',
      },
    };
  }) || [];

  // Better approach: Derive trendData from checkInHistory to reuse dayNumber logic
  const trendData = checkInHistory.slice(0, 7).reverse().map(checkIn => ({
    day: `D${checkIn.dayNumber}`,
    weight: checkIn.vitals.morningWeight,
    nutrition: checkIn.nutrition.score,
    performance: checkIn.workout.performance || 0,
    energy: checkIn.wellbeing.energyLevel,
    stress: checkIn.wellbeing.stressLevel,
    sleep: checkIn.vitals.sleepHours,
    steps: checkIn.nutrition.dailySteps,
    water: checkIn.nutrition.waterLiters,
  }));

  // Calculate metrics from real data
  const last7Days = checkIns?.slice(0, 7) || [];
  const avgNutrition = last7Days.length > 0
    ? (last7Days.reduce((sum, c) => sum + (c.nutrition_score || 0), 0) / last7Days.length).toFixed(1)
    : '0';

  const workoutDays = last7Days.filter(c => c.workout_performance);
  const avgPerformance = workoutDays.length > 0
    ? (workoutDays.reduce((sum, c) => sum + (c.workout_performance || 0), 0) / workoutDays.length).toFixed(1)
    : '0';

  const totalDays = checkIns?.length || 0;
  const trackedDays = checkIns?.filter(c => c.nutrition_score || c.workout_status).length || 0;
  const consistencyRate = totalDays > 0 ? Math.round((trackedDays / totalDays) * 100) : 0;

  const firstWeight = checkIns?.[checkIns.length - 1]?.morning_weight || 0;
  const lastWeight = checkIns?.[0]?.morning_weight || 0;
  const weightLost = firstWeight && lastWeight
    ? (parseFloat(firstWeight) - parseFloat(lastWeight)).toFixed(1)
    : '0';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading check-ins...</p>
        </div>
      </div>
    );
  }

  if (!checkIns || checkIns.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">No Check-Ins Yet</h2>
          <p className="text-muted-foreground">
            You haven't recorded any daily check-ins yet. Start tracking your progress today!
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2" data-testid="text-checkins-title">Daily Check-Ins History</h1>
        <p className="text-muted-foreground">Comprehensive day-by-day analytics of your fitness journey</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Avg Nutrition Score"
          value={avgNutrition}
          icon={Activity}
          subtitle="Last 7 days"
        />
        <MetricCard
          title="Avg Performance"
          value={avgPerformance}
          icon={TrendingUp}
          subtitle="When tracked"
        />
        <MetricCard
          title="Consistency Rate"
          value={`${consistencyRate}%`}
          icon={Award}
          subtitle="Check-ins completed"
        />
        <MetricCard
          title="Weight Progress"
          value={`${parseFloat(weightLost) >= 0 ? '-' : '+'}${Math.abs(parseFloat(weightLost))} kg`}
          icon={TrendingDown}
          trend={parseFloat(weightLost) !== 0 ? { value: Math.abs(parseFloat(weightLost)), isPositive: parseFloat(weightLost) > 0 } : undefined}
          subtitle="Total change"
        />
      </div>

      <CheckInTrendsChart data={trendData} />

      <div>
        <h3 className="text-2xl font-bold mb-6">Recent Check-Ins</h3>
        <div className="space-y-6">
          {checkInHistory.map((checkIn) => (
            <DailyCheckInCard key={checkIn.dayNumber} data={checkIn} />
          ))}
        </div>
      </div>
    </div>
  );
}
