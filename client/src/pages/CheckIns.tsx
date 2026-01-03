import { WeeklyCheckInTable } from "@/components/WeeklyCheckInTable";
import { CheckInTrendsChart } from "@/components/CheckInTrendsChart";
import { MetricCard } from "@/components/MetricCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, TrendingDown, TrendingUp, Award, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { processCheckInHistory } from "@/lib/checkin-utils";
import { useState } from "react";
import { CheckInDialog } from "@/components/CheckInDialog";

export default function CheckIns() {
  const { user, viewedUserId } = useAuth();
  const targetUserId = viewedUserId || user?.id;

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Fetch check-ins from Supabase
  const { data: checkIns, isLoading, refetch } = useQuery({
    queryKey: ['dailyCheckIns', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];

      const { data, error } = await supabase
        .from('daily_check_ins')
        .select('*')
        .eq('user_id', targetUserId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!targetUserId,
  });

  const handleAddCheckIn = () => {
    setSelectedDate(undefined); // Default to today/empty in dialog logic
    setIsDialogOpen(true);
  };

  const handleEditCheckIn = (date: Date) => {
    setSelectedDate(date);
    setIsDialogOpen(true);
  };

  const handleSuccess = () => {
    refetch();
  };

  // Transform check-ins for the card display using the utility
  const processedHistory = checkIns ? processCheckInHistory(checkIns) : [];

  const checkInHistory = processedHistory.map((item, index) => {
    // For missed days, we return a minimal structure that the Card can handle or we handle it here
    if (item.status === 'missed') {
      return {
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        dayNumber: item.dayNumber,
        status: 'missed' as const,
        vitals: { morningWeight: 0, sleepHours: 0, weightChange: 0 },
        workout: { status: 'no' as const },
        nutrition: { score: 0, calorieIntake: 0, waterLiters: 0, dailySteps: 0 },
        wellbeing: { energyLevel: 0, hungerLevel: 0, stressLevel: 0, digestion: 'none' as const },
      };
    }

    const checkIn = item.originalCheckIn!;

    // Find previous check-in (which might be earlier in the processed list since it's reversed)
    // Actually, finding strict previous weight requires looking at the raw sorted list or searching here.
    // For simplicity, let's look at the next valid item in the processed list that has weight
    let prevWeight = checkIn.morning_weight?.toString();
    for (let i = index + 1; i < processedHistory.length; i++) {
      const candidateCheckIn = processedHistory[i];
      if (candidateCheckIn.status === 'done' && candidateCheckIn.originalCheckIn?.morning_weight != null) {
        prevWeight = candidateCheckIn.originalCheckIn.morning_weight.toString();
        break;
      }
    }

    const currentWeightStr = checkIn.morning_weight?.toString();
    const weightChange = currentWeightStr
      ? parseFloat(currentWeightStr) - parseFloat(prevWeight || currentWeightStr)
      : 0;

    return {
      date: new Date(checkIn.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      dayNumber: item.dayNumber,
      status: 'done' as const,
      vitals: {
        morningWeight: parseFloat(checkIn.morning_weight?.toString() || '0'),
        sleepHours: parseFloat(checkIn.sleep_hours?.toString() || '0'),
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
        waterLiters: parseFloat(checkIn.water_liters?.toString() || '0'),
        dailySteps: checkIn.daily_steps || 0,
      },
      wellbeing: {
        energyLevel: checkIn.energy_level || 0,
        hungerLevel: checkIn.hunger_level || 0,
        stressLevel: checkIn.stress_level || 0,
        digestion: (checkIn.digestion || 'none') as 'none' | 'bloated' | 'constipated' | 'diarrhea',
      },
    };
  });

  // Calculate trendData from formatted history
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

  const totalDays = processedHistory.length || 0;
  const trackedDays = checkIns?.length || 0;
  // Consistency is strictly (tracked / total elapsed days) * 100
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

  // Handle empty state separately but include Add button
  const isEmpty = !checkIns || checkIns.length === 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold mb-2" data-testid="text-checkins-title">Daily Check-Ins History</h1>
          <p className="text-sm md:text-base text-muted-foreground">Comprehensive day-by-day analytics of your fitness journey</p>
        </div>
        {!viewedUserId && ( // Only show Add button if viewing own data
          <Button onClick={handleAddCheckIn} className="rounded-xl">
            <Plus className="w-4 h-4 mr-2" />
            Log Check-In
          </Button>
        )}
      </div>

      {isEmpty ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <Card className="p-8 text-center max-w-md">
            <h2 className="text-2xl font-bold mb-4">No Check-Ins Yet</h2>
            <p className="text-muted-foreground mb-6">
              You haven't recorded any daily check-ins yet. Start tracking your progress today!
            </p>
            {!viewedUserId && (
              <Button onClick={handleAddCheckIn}>
                Log First Check-In
              </Button>
            )}
          </Card>
        </div>
      ) : (
        <>
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
            <h3 className="text-2xl font-bold mb-6">Check-In History</h3>
            <WeeklyCheckInTable
              checkIns={processedHistory}
              onEdit={!viewedUserId ? handleEditCheckIn : undefined}
            />
          </div>
        </>
      )}

      <CheckInDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        selectedDate={selectedDate}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
