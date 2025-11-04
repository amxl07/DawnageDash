import { DailyCheckInCard } from "@/components/DailyCheckInCard";
import { CheckInTrendsChart } from "@/components/CheckInTrendsChart";
import { MetricCard } from "@/components/MetricCard";
import { Activity, TrendingDown, TrendingUp, Award } from "lucide-react";

export default function CheckIns() {
  // TODO: Remove mock data - fetch from Supabase
  const checkInHistory = [
    {
      date: 'Feb 4, 2025',
      dayNumber: 28,
      vitals: { morningWeight: 78.5, sleepHours: 7.5, weightChange: -0.3 },
      workout: { status: 'done' as const, performance: 9 },
      nutrition: { score: 9, calorieIntake: 2100, waterLiters: 2.8, dailySteps: 9200 },
      wellbeing: { energyLevel: 9, hungerLevel: 4, stressLevel: 2, digestion: 'none' as const },
    },
    {
      date: 'Feb 3, 2025',
      dayNumber: 27,
      vitals: { morningWeight: 78.8, sleepHours: 8, weightChange: -0.2 },
      workout: { status: 'rest_day' as const },
      nutrition: { score: 8, calorieIntake: 2000, waterLiters: 2.5, dailySteps: 6500 },
      wellbeing: { energyLevel: 8, hungerLevel: 5, stressLevel: 3, digestion: 'none' as const },
    },
    {
      date: 'Feb 2, 2025',
      dayNumber: 26,
      vitals: { morningWeight: 79.0, sleepHours: 7, weightChange: -0.4 },
      workout: { status: 'done' as const, performance: 8 },
      nutrition: { score: 9, calorieIntake: 2050, waterLiters: 3.0, dailySteps: 10500 },
      wellbeing: { energyLevel: 8, hungerLevel: 4, stressLevel: 2, digestion: 'none' as const },
    },
    {
      date: 'Feb 1, 2025',
      dayNumber: 25,
      vitals: { morningWeight: 79.4, sleepHours: 6.5, weightChange: -0.1 },
      workout: { status: 'cardio_day' as const, performance: 7 },
      nutrition: { score: 8, calorieIntake: 1950, waterLiters: 2.6, dailySteps: 12000 },
      wellbeing: { energyLevel: 7, hungerLevel: 6, stressLevel: 4, digestion: 'none' as const },
    },
    {
      date: 'Jan 31, 2025',
      dayNumber: 24,
      vitals: { morningWeight: 79.5, sleepHours: 8, weightChange: -0.3 },
      workout: { status: 'done' as const, performance: 9 },
      nutrition: { score: 10, calorieIntake: 2100, waterLiters: 2.8, dailySteps: 8900 },
      wellbeing: { energyLevel: 9, hungerLevel: 4, stressLevel: 2, digestion: 'none' as const },
    },
    {
      date: 'Jan 30, 2025',
      dayNumber: 23,
      vitals: { morningWeight: 79.8, sleepHours: 7.5, weightChange: -0.2 },
      workout: { status: 'done' as const, performance: 8 },
      nutrition: { score: 9, calorieIntake: 2000, waterLiters: 2.7, dailySteps: 9500 },
      wellbeing: { energyLevel: 8, hungerLevel: 5, stressLevel: 3, digestion: 'none' as const },
    },
    {
      date: 'Jan 29, 2025',
      dayNumber: 22,
      vitals: { morningWeight: 80.0, sleepHours: 7, weightChange: -0.5 },
      workout: { status: 'no' as const },
      nutrition: { score: 7, calorieIntake: 2200, waterLiters: 2.0, dailySteps: 5500 },
      wellbeing: { energyLevel: 6, hungerLevel: 7, stressLevel: 6, digestion: 'bloated' as const },
    },
  ];

  // TODO: Remove mock data - calculate from Supabase
  const trendData = [
    { day: 'D22', weight: 80.0, nutrition: 7, performance: 0, energy: 6, stress: 6, sleep: 7, steps: 5500, water: 2.0 },
    { day: 'D23', weight: 79.8, nutrition: 9, performance: 8, energy: 8, stress: 3, sleep: 7.5, steps: 9500, water: 2.7 },
    { day: 'D24', weight: 79.5, nutrition: 10, performance: 9, energy: 9, stress: 2, sleep: 8, steps: 8900, water: 2.8 },
    { day: 'D25', weight: 79.4, nutrition: 8, performance: 7, energy: 7, stress: 4, sleep: 6.5, steps: 12000, water: 2.6 },
    { day: 'D26', weight: 79.0, nutrition: 9, performance: 8, energy: 8, stress: 2, sleep: 7, steps: 10500, water: 3.0 },
    { day: 'D27', weight: 78.8, nutrition: 8, performance: 0, energy: 8, stress: 3, sleep: 8, steps: 6500, water: 2.5 },
    { day: 'D28', weight: 78.5, nutrition: 9, performance: 9, energy: 9, stress: 2, sleep: 7.5, steps: 9200, water: 2.8 },
  ];

  // TODO: Remove mock data - calculate from Supabase
  const avgNutrition = 8.6;
  const avgPerformance = 8.2;
  const consistencyRate = 86;
  const weightLost = 1.5;

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
          trend={{ value: 12, isPositive: true }}
          subtitle="Last 7 days"
        />
        <MetricCard
          title="Avg Performance"
          value={avgPerformance}
          icon={TrendingUp}
          trend={{ value: 8, isPositive: true }}
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
          value={`-${weightLost} kg`}
          icon={TrendingDown}
          trend={{ value: 1.9, isPositive: false }}
          subtitle="Last 7 days"
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
