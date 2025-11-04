import { MetricCard } from '../MetricCard';
import { Weight, Flame, Trophy, Zap } from 'lucide-react';

export default function MetricCardExample() {
  return (
    <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-background">
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
  );
}
