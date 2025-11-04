import { MetricCard } from "@/components/MetricCard";
import { WeightChart } from "@/components/WeightChart";
import { PerformanceChart } from "@/components/PerformanceChart";
import { NutritionBreakdownChart } from "@/components/NutritionBreakdownChart";
import { WeeklyComparisonChart } from "@/components/WeeklyComparisonChart";
import { WorkoutHeatmap } from "@/components/WorkoutHeatmap";
import { ProgressBar } from "@/components/ProgressBar";
import { Card } from "@/components/ui/card";
import { Weight, Flame, Trophy, Zap, TrendingUp, Activity, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  // TODO: Remove mock data - fetch from Supabase
  const weightData = [
    { date: 'W1', weight: 82.5 },
    { date: 'W2', weight: 81.8 },
    { date: 'W3', weight: 81.2 },
    { date: 'W4', weight: 80.5 },
    { date: 'W5', weight: 79.8 },
    { date: 'W6', weight: 79.2 },
    { date: 'W7', weight: 78.5 },
  ];

  const performanceData = [
    { day: 'Mon', performance: 8, nutrition: 9, energy: 7 },
    { day: 'Tue', performance: 9, nutrition: 8, energy: 8 },
    { day: 'Wed', performance: 7, nutrition: 9, energy: 9 },
    { day: 'Thu', performance: 9, nutrition: 10, energy: 8 },
    { day: 'Fri', performance: 8, nutrition: 8, energy: 7 },
    { day: 'Sat', performance: 10, nutrition: 9, energy: 9 },
    { day: 'Sun', performance: 0, nutrition: 9, energy: 8 },
  ];

  const weeklyComparisonData = [
    { week: 'W1', workouts: 5, avgNutrition: 7.5, avgEnergy: 7.2, avgSleep: 7.2 },
    { week: 'W2', workouts: 6, avgNutrition: 8.2, avgEnergy: 7.8, avgSleep: 7.5 },
    { week: 'W3', workouts: 6, avgNutrition: 8.8, avgEnergy: 8.4, avgSleep: 7.8 },
    { week: 'W4', workouts: 6, avgNutrition: 9.1, avgEnergy: 8.7, avgSleep: 8.0 },
  ];

  const heatmapData = [
    // Week 1
    { date: 'Jan 1', status: 'done' as const, intensity: 8 },
    { date: 'Jan 2', status: 'done' as const, intensity: 7 },
    { date: 'Jan 3', status: 'done' as const, intensity: 9 },
    { date: 'Jan 4', status: 'rest' as const },
    { date: 'Jan 5', status: 'done' as const, intensity: 8 },
    { date: 'Jan 6', status: 'done' as const, intensity: 9 },
    { date: 'Jan 7', status: 'rest' as const },
    // Week 2
    { date: 'Jan 8', status: 'done' as const, intensity: 9 },
    { date: 'Jan 9', status: 'done' as const, intensity: 8 },
    { date: 'Jan 10', status: 'done' as const, intensity: 7 },
    { date: 'Jan 11', status: 'rest' as const },
    { date: 'Jan 12', status: 'done' as const, intensity: 9 },
    { date: 'Jan 13', status: 'done' as const, intensity: 10 },
    { date: 'Jan 14', status: 'rest' as const },
    // Week 3
    { date: 'Jan 15', status: 'done' as const, intensity: 8 },
    { date: 'Jan 16', status: 'done' as const, intensity: 9 },
    { date: 'Jan 17', status: 'done' as const, intensity: 8 },
    { date: 'Jan 18', status: 'rest' as const },
    { date: 'Jan 19', status: 'done' as const, intensity: 9 },
    { date: 'Jan 20', status: 'done' as const, intensity: 10 },
    { date: 'Jan 21', status: 'rest' as const },
    // Week 4
    { date: 'Jan 22', status: 'done' as const, intensity: 9 },
    { date: 'Jan 23', status: 'missed' as const },
    { date: 'Jan 24', status: 'done' as const, intensity: 8 },
    { date: 'Jan 25', status: 'rest' as const },
    { date: 'Jan 26', status: 'done' as const, intensity: 9 },
    { date: 'Jan 27', status: 'done' as const, intensity: 10 },
    { date: 'Jan 28', status: 'done' as const, intensity: 8 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive insights into your fitness journey with real-time data tracking</p>
        </div>
        <Badge className="rounded-full text-sm px-4 py-2">
          <Activity className="w-4 h-4 mr-2" />
          Day 28 • Week 4
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Current Weight"
          value="78.5 kg"
          icon={Weight}
          trend={{ value: 2.3, isPositive: false }}
          subtitle="Last 7 days"
        />
        <MetricCard
          title="Workouts"
          value="24"
          icon={Flame}
          trend={{ value: 15, isPositive: true }}
          subtitle="This month"
        />
        <MetricCard
          title="Nutrition Score"
          value="8.7"
          icon={Trophy}
          subtitle="Average this week"
        />
        <MetricCard
          title="Energy Level"
          value="9/10"
          icon={Zap}
          trend={{ value: 10, isPositive: true }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WeightChart data={weightData} />
        <PerformanceChart data={performanceData} />
      </div>

      <WorkoutHeatmap data={heatmapData} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NutritionBreakdownChart protein={151} carbs={207} fats={63} />
        <WeeklyComparisonChart data={weeklyComparisonData} />
      </div>

      <Card className="p-6 rounded-2xl">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-2xl font-bold">Current Week Progress</h3>
            <Badge variant="outline" className="rounded-full">
              <Target className="w-4 h-4 mr-2" />
              6/7 days tracked
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Track your goals and stay on target this week</p>
        </div>
        <div className="space-y-6">
          <ProgressBar value={7500} max={10000} label="Daily Steps Goal" variant="success" />
          <ProgressBar value={8.7} max={10} label="Nutrition Score" variant="gold" />
          <ProgressBar value={5} max={6} label="Workouts This Week" variant="primary" />
          <ProgressBar value={55} max={60} label="Sleep Hours (Weekly)" variant="success" />
        </div>
      </Card>
    </div>
  );
}
