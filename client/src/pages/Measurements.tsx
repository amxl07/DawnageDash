import { MeasurementCard } from "@/components/MeasurementCard";
import { MeasurementProgressChart } from "@/components/MeasurementProgressChart";
import { MeasurementComparisonCard } from "@/components/MeasurementComparisonCard";
import { MetricCard } from "@/components/MetricCard";
import { TrendingDown, Ruler, Target } from "lucide-react";

export default function Measurements() {
  // TODO: Remove mock data - fetch from Supabase
  const measurements = [
    {
      date: 'Jan 29, 2025',
      weekNumber: 4,
      measurements: { weight: 78.5, chest: 100, waist: 84, hip: 95, thigh: 56, arm: 34.5 },
      changes: { weight: -1.2 },
    },
    {
      date: 'Jan 22, 2025',
      weekNumber: 3,
      measurements: { weight: 79.7, chest: 101, waist: 85, hip: 96, thigh: 56.5, arm: 35 },
      changes: { weight: -1.1 },
    },
    {
      date: 'Jan 15, 2025',
      weekNumber: 2,
      measurements: { weight: 80.8, chest: 101.5, waist: 86, hip: 97, thigh: 57, arm: 35.5 },
      changes: { weight: -1.4 },
    },
    {
      date: 'Jan 8, 2025',
      weekNumber: 1,
      measurements: { weight: 82.2, chest: 102, waist: 88, hip: 98, thigh: 58, arm: 36 },
    },
  ];

  // TODO: Remove mock data - fetch from Supabase
  const progressData = [
    { week: 'W1', weight: 82.2, chest: 102, waist: 88, hip: 98, thigh: 58, arm: 36 },
    { week: 'W2', weight: 80.8, chest: 101.5, waist: 86, hip: 97, thigh: 57, arm: 35.5 },
    { week: 'W3', weight: 79.7, chest: 101, waist: 85, hip: 96, thigh: 56.5, arm: 35 },
    { week: 'W4', weight: 78.5, chest: 100, waist: 84, hip: 95, thigh: 56, arm: 34.5 },
  ];

  // TODO: Remove mock data - fetch from Supabase
  const comparisonData = {
    current: {
      week: 4,
      date: 'Jan 29, 2025',
      weight: 78.5,
      chest: 100,
      waist: 84,
      hip: 95,
      thigh: 56,
      arm: 34.5,
    },
    start: {
      week: 1,
      date: 'Jan 8, 2025',
      weight: 82.2,
      chest: 102,
      waist: 88,
      hip: 98,
      thigh: 58,
      arm: 36,
    },
  };

  const totalWeightLost = 3.7;
  const waistReduction = 4;
  const avgWeeklyLoss = 1.2;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2" data-testid="text-measurements-title">Body Measurements & Progress</h1>
        <p className="text-muted-foreground">Track your body composition changes and transformation analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Total Weight Lost"
          value={`${totalWeightLost} kg`}
          icon={TrendingDown}
          trend={{ value: 4.5, isPositive: false }}
          subtitle="Since start"
        />
        <MetricCard
          title="Waist Reduction"
          value={`${waistReduction} cm`}
          icon={Ruler}
          subtitle="4 weeks"
        />
        <MetricCard
          title="Avg Weekly Loss"
          value={`${avgWeeklyLoss} kg`}
          icon={Target}
          subtitle="Consistent progress"
        />
      </div>

      <MeasurementProgressChart data={progressData} />

      <MeasurementComparisonCard data={comparisonData} />

      <div>
        <h3 className="text-2xl font-bold mb-6">Measurement History</h3>
        <div className="space-y-6">
          {measurements.map((measurement, index) => (
            <MeasurementCard key={index} {...measurement} />
          ))}
        </div>
      </div>
    </div>
  );
}
