import { MeasurementCard } from "@/components/MeasurementCard";
import { MeasurementProgressChart } from "@/components/MeasurementProgressChart";
import { MeasurementComparisonCard } from "@/components/MeasurementComparisonCard";
import { MetricCard } from "@/components/MetricCard";
import { Card } from "@/components/ui/card";
import { TrendingDown, Ruler, Target } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export default function Measurements() {
  const { user } = useAuth();

  // Fetch measurements from Supabase
  const { data: bodyMeasurements, isLoading } = useQuery({
    queryKey: ['bodyMeasurements', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Transform measurements for card display
  const measurements = bodyMeasurements?.map((measurement, index) => {
    const prevMeasurement = bodyMeasurements[index + 1];
    const weightChange = prevMeasurement
      ? parseFloat(measurement.weight || '0') - parseFloat(prevMeasurement.weight || '0')
      : 0;

    return {
      date: new Date(measurement.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      weekNumber: index + 1,
      measurements: {
        weight: parseFloat(measurement.weight || '0'),
        chest: parseFloat(measurement.chest || '0'),
        waist: parseFloat(measurement.waist || '0'),
        hip: parseFloat(measurement.hips || '0'),
        thigh: parseFloat(measurement.thighs || '0'),
        arm: parseFloat(measurement.arms || '0'),
      },
      changes: weightChange !== 0 ? { weight: weightChange } : undefined,
    };
  }) || [];

  // Transform measurements for progress chart
  const progressData = bodyMeasurements?.slice().reverse().map((measurement, index) => ({
    week: `W${index + 1}`,
    weight: parseFloat(measurement.weight || '0'),
    chest: parseFloat(measurement.chest || '0'),
    waist: parseFloat(measurement.waist || '0'),
    hip: parseFloat(measurement.hips || '0'),
    thigh: parseFloat(measurement.thighs || '0'),
    arm: parseFloat(measurement.arms || '0'),
  })) || [];

  // Comparison data (current vs start)
  const currentMeasurement = bodyMeasurements?.[0];
  const startMeasurement = bodyMeasurements?.[bodyMeasurements.length - 1];

  const comparisonData = currentMeasurement && startMeasurement ? {
    current: {
      week: bodyMeasurements?.length || 0,
      date: new Date(currentMeasurement.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      weight: parseFloat(currentMeasurement.weight || '0'),
      chest: parseFloat(currentMeasurement.chest || '0'),
      waist: parseFloat(currentMeasurement.waist || '0'),
      hip: parseFloat(currentMeasurement.hips || '0'),
      thigh: parseFloat(currentMeasurement.thighs || '0'),
      arm: parseFloat(currentMeasurement.arms || '0'),
    },
    start: {
      week: 1,
      date: new Date(startMeasurement.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      weight: parseFloat(startMeasurement.weight || '0'),
      chest: parseFloat(startMeasurement.chest || '0'),
      waist: parseFloat(startMeasurement.waist || '0'),
      hip: parseFloat(startMeasurement.hips || '0'),
      thigh: parseFloat(startMeasurement.thighs || '0'),
      arm: parseFloat(startMeasurement.arms || '0'),
    },
  } : null;

  // Calculate metrics
  const totalWeightLost = currentMeasurement && startMeasurement
    ? (parseFloat(startMeasurement.weight || '0') - parseFloat(currentMeasurement.weight || '0')).toFixed(1)
    : '0';

  const waistReduction = currentMeasurement && startMeasurement
    ? (parseFloat(startMeasurement.waist || '0') - parseFloat(currentMeasurement.waist || '0')).toFixed(0)
    : '0';

  const totalWeeks = bodyMeasurements?.length || 1;
  const avgWeeklyLoss = totalWeeks > 0
    ? (parseFloat(totalWeightLost) / totalWeeks).toFixed(1)
    : '0';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading measurements...</p>
        </div>
      </div>
    );
  }

  if (!bodyMeasurements || bodyMeasurements.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">No Measurements Yet</h2>
          <p className="text-muted-foreground">
            You haven't recorded any body measurements yet. Start tracking your physical progress today!
          </p>
        </Card>
      </div>
    );
  }

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
          trend={parseFloat(totalWeightLost) !== 0 ? { value: parseFloat(totalWeightLost), isPositive: false } : undefined}
          subtitle="Since start"
        />
        <MetricCard
          title="Waist Reduction"
          value={`${waistReduction} cm`}
          icon={Ruler}
          subtitle={`${totalWeeks} ${totalWeeks === 1 ? 'week' : 'weeks'}`}
        />
        <MetricCard
          title="Avg Weekly Loss"
          value={`${avgWeeklyLoss} kg`}
          icon={Target}
          subtitle="Consistent progress"
        />
      </div>

      {progressData.length > 0 && <MeasurementProgressChart data={progressData} />}

      {comparisonData && <MeasurementComparisonCard data={comparisonData} />}

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
