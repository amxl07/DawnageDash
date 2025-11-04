import { MetricCard } from "@/components/MetricCard";
import { WeightChart } from "@/components/WeightChart";
import { PerformanceChart } from "@/components/PerformanceChart";
import { ProgressBar } from "@/components/ProgressBar";
import { Card } from "@/components/ui/card";
import { Weight, Flame, Trophy, Zap, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const weightData = [
    { date: 'Week 1', weight: 82.5 },
    { date: 'Week 2', weight: 81.8 },
    { date: 'Week 3', weight: 81.2 },
    { date: 'Week 4', weight: 80.5 },
    { date: 'Week 5', weight: 79.8 },
    { date: 'Week 6', weight: 79.2 },
    { date: 'Week 7', weight: 78.5 },
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground">Gain unprecedented insights into your fitness journey with our comprehensive dashboard</p>
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

      <Card className="p-6 rounded-2xl">
        <div className="mb-6">
          <h3 className="text-2xl font-bold mb-2">Current Week Progress</h3>
          <p className="text-sm text-muted-foreground">Track your goals and stay on target</p>
        </div>
        <div className="space-y-6">
          <ProgressBar value={7500} max={10000} label="Daily Steps Goal" variant="success" />
          <ProgressBar value={8} max={10} label="Nutrition Score" variant="gold" />
          <ProgressBar value={4} max={6} label="Workouts This Week" variant="primary" />
        </div>
      </Card>
    </div>
  );
}
