import { MetricCard } from "@/components/MetricCard";
import { WeightChart } from "@/components/WeightChart";
import { PerformanceChart } from "@/components/PerformanceChart";
import { NutritionBreakdownChart } from "@/components/NutritionBreakdownChart";
import { WeeklyComparisonChart } from "@/components/WeeklyComparisonChart";
import { WorkoutHeatmap } from "@/components/WorkoutHeatmap";
import { ProgressBar } from "@/components/ProgressBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Weight, Flame, Trophy, Zap, Activity, Target, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDashboardData } from "@/hooks/useDashboardData";

export default function Dashboard() {
  const {
    checkIns,
    metrics,
    weightTrend,
    weightChartData,
    performanceChartData,
    nutritionBreakdown,
    isLoading,
  } = useDashboardData();

  // Calculate workout heatmap from check-ins
  const heatmapData = checkIns?.map(checkIn => ({
    date: new Date(checkIn.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    status: (checkIn.workout_status === 'done' ? 'done' :
             checkIn.workout_status === 'rest_day' ? 'rest' :
             checkIn.workout_status === 'no' ? 'missed' : 'rest') as 'done' | 'rest' | 'missed',
    intensity: checkIn.workout_performance || 0,
  })) || [];

  // Calculate weekly comparison data
  const weeklyComparisonData: Array<{
    week: string;
    workouts: number;
    avgNutrition: number;
    avgEnergy: number;
    avgSleep: number;
  }> = [];
  if (checkIns && checkIns.length > 0) {
    const weeksData = new Map();

    checkIns.forEach(checkIn => {
      const date = new Date(checkIn.date);
      const weekNum = Math.ceil((date.getDate()) / 7);
      const weekKey = `W${weekNum}`;

      if (!weeksData.has(weekKey)) {
        weeksData.set(weekKey, {
          week: weekKey,
          workouts: 0,
          nutritionSum: 0,
          energySum: 0,
          sleepSum: 0,
          count: 0,
        });
      }

      const week = weeksData.get(weekKey);
      if (checkIn.workout_status === 'done') week.workouts++;
      week.nutritionSum += checkIn.nutrition_score || 0;
      week.energySum += checkIn.energy_level || 0;
      week.sleepSum += parseFloat(checkIn.sleep_hours || '0');
      week.count++;
    });

    weeksData.forEach(week => {
      weeklyComparisonData.push({
        week: week.week,
        workouts: week.workouts,
        avgNutrition: week.count > 0 ? +(week.nutritionSum / week.count).toFixed(1) : 0,
        avgEnergy: week.count > 0 ? +(week.energySum / week.count).toFixed(1) : 0,
        avgSleep: week.count > 0 ? +(week.sleepSum / week.count).toFixed(1) : 0,
      });
    });
  }

  // Calculate progress metrics
  const totalDaysTracked = checkIns?.length || 0;
  const currentWeek = Math.ceil(totalDaysTracked / 7);
  const last7CheckIns = checkIns?.slice(-7) || [];
  const workoutsThisWeek = last7CheckIns.filter(c => c.workout_status === 'done').length;
  const sleepThisWeek = last7CheckIns.reduce((sum, c) => sum + parseFloat(c.sleep_hours || '0'), 0);
  const avgStepsThisWeek = last7CheckIns.length > 0
    ? Math.round(last7CheckIns.reduce((sum, c) => sum + (c.daily_steps || 0), 0) / last7CheckIns.length)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!checkIns || checkIns.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-2xl w-full space-y-6">
          {/* Welcome Card */}
          <Card className="p-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Welcome to Dawnage AI! 🎉</h2>
            <p className="text-muted-foreground mb-4">
              You don't have any check-ins or measurements recorded yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Start tracking your fitness journey by adding your first check-in or measurement.
            </p>
          </Card>

          {/* WhatsApp Activation Card for New Users */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
            <div className="p-8">
              <div className="flex flex-col items-center text-center gap-6">
                {/* WhatsApp Icon */}
                <div className="w-20 h-20 rounded-2xl bg-green-500 flex items-center justify-center shadow-lg">
                  <MessageCircle className="w-10 h-10 text-white" />
                </div>

                {/* Title */}
                <div>
                  <h3 className="text-3xl font-bold text-green-900 dark:text-green-100 mb-3">
                    Activate Your AI Fitness Assistant
                  </h3>
                  <p className="text-green-800 dark:text-green-200 text-lg max-w-xl mx-auto">
                    Get started with personalized fitness coaching directly on WhatsApp!
                    Track your progress, receive daily reminders, and get instant feedback.
                  </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl mt-4">
                  <div className="flex flex-col items-center gap-2 p-4 bg-white/50 dark:bg-green-900/20 rounded-xl">
                    <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="font-semibold text-green-900 dark:text-green-100">Daily Check-ins</span>
                    <span className="text-sm text-green-700 dark:text-green-300 text-center">
                      Log workouts & meals via chat
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-2 p-4 bg-white/50 dark:bg-green-900/20 rounded-xl">
                    <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="font-semibold text-green-900 dark:text-green-100">Real-time Coaching</span>
                    <span className="text-sm text-green-700 dark:text-green-300 text-center">
                      Instant feedback & tips
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-2 p-4 bg-white/50 dark:bg-green-900/20 rounded-xl">
                    <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                      <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="font-semibold text-green-900 dark:text-green-100">Smart Reminders</span>
                    <span className="text-sm text-green-700 dark:text-green-300 text-center">
                      Stay on track daily
                    </span>
                  </div>
                </div>

                {/* CTA Button */}
                <Button
                  onClick={() => {
                    const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || "918075054992";
                    const message = import.meta.env.VITE_WHATSAPP_DEFAULT_MESSAGE || "Hi! I want to activate my Dawnage AI fitness assistant.";
                    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, "_blank");
                  }}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white font-bold text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all mt-4"
                >
                  <MessageCircle className="w-6 h-6 mr-3" />
                  Activate on WhatsApp Now
                </Button>

                <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                  Click to start chatting with your AI coach on WhatsApp
                </p>
              </div>
            </div>

            {/* Decorative background */}
            <div className="absolute bottom-0 right-0 opacity-10 pointer-events-none">
              <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
                <circle cx="150" cy="150" r="100" fill="currentColor" className="text-green-600" />
                <circle cx="180" cy="120" r="60" fill="currentColor" className="text-green-500" />
              </svg>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive insights into your fitness journey with real-time data tracking</p>
        </div>
        <div className="flex flex-col gap-3 items-end">
          <Badge className="rounded-full text-sm px-4 py-2">
            <Activity className="w-4 h-4 mr-2" />
            Day {totalDaysTracked} • Week {currentWeek}
          </Badge>
          {/* WhatsApp Activation Button - Top Right */}
          <Button
            onClick={() => {
              const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || "918075054992";
              const message = import.meta.env.VITE_WHATSAPP_DEFAULT_MESSAGE || "Hi! I want to activate my Dawnage AI fitness assistant.";
              const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
              window.open(whatsappUrl, "_blank");
            }}
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Activate AI on WhatsApp
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Current Weight"
          value={`${metrics.currentWeight} kg`}
          icon={Weight}
          trend={weightTrend !== 0 ? { value: Math.abs(weightTrend), isPositive: weightTrend < 0 } : undefined}
          subtitle="Last 7 days"
        />
        <MetricCard
          title="Workouts"
          value={metrics.totalWorkouts.toString()}
          icon={Flame}
          subtitle="Total tracked"
        />
        <MetricCard
          title="Nutrition Score"
          value={metrics.avgNutritionScore}
          icon={Trophy}
          subtitle="Average score"
        />
        <MetricCard
          title="Energy Level"
          value={`${metrics.avgEnergyLevel}/10`}
          icon={Zap}
          subtitle="Average level"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WeightChart data={weightChartData} />
        <PerformanceChart data={performanceChartData} />
      </div>

      {heatmapData.length > 0 && <WorkoutHeatmap data={heatmapData} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NutritionBreakdownChart
          protein={nutritionBreakdown.protein}
          carbs={nutritionBreakdown.carbs}
          fats={nutritionBreakdown.fats}
        />
        {weeklyComparisonData.length > 0 && <WeeklyComparisonChart data={weeklyComparisonData} />}
      </div>

      <Card className="p-6 rounded-2xl">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-2xl font-bold">Current Week Progress</h3>
            <Badge variant="outline" className="rounded-full">
              <Target className="w-4 h-4 mr-2" />
              {last7CheckIns.length}/7 days tracked
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Track your goals and stay on target this week</p>
        </div>
        <div className="space-y-6">
          <ProgressBar
            value={avgStepsThisWeek}
            max={10000}
            label="Daily Steps Goal (Avg)"
            variant="success"
          />
          <ProgressBar
            value={parseFloat(metrics.avgNutritionScore)}
            max={10}
            label="Nutrition Score"
            variant="gold"
          />
          <ProgressBar
            value={workoutsThisWeek}
            max={6}
            label="Workouts This Week"
            variant="primary"
          />
          <ProgressBar
            value={sleepThisWeek}
            max={56}
            label="Sleep Hours (Weekly)"
            variant="success"
          />
        </div>
      </Card>
    </div>
  );
}
