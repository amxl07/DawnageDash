import { useState } from "react";
import { MeasurementCard } from "@/components/MeasurementCard";
import { MeasurementProgressChart } from "@/components/MeasurementProgressChart";
import { MeasurementComparisonCard } from "@/components/MeasurementComparisonCard";
import { MetricCard } from "@/components/MetricCard";
import { Button } from "@/components/ui/button";
import { TrendingDown, Ruler, Target, Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { calculateWeeklyAverages } from "@/lib/checkin-utils";
import { MeasurementDialog } from "@/components/MeasurementDialog";

export default function Measurements() {
  const { user, viewedUserId } = useAuth();
  const targetUserId = viewedUserId || user?.id; // Use viewed user or current user

  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Fetch measurements from Supabase
  const { data: bodyMeasurements, isLoading } = useQuery({
    queryKey: ['bodyMeasurements', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];

      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', targetUserId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!targetUserId,
  });

  const handleAddMeasurement = () => {
    setSelectedDate(undefined);
    setIsDialogOpen(true);
  };

  const handleEditMeasurement = (dateStr: string) => {
    setSelectedDate(new Date(dateStr));
    setIsDialogOpen(true);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['bodyMeasurements'] });
  };

  // Transform measurements for card display
  const measurements = bodyMeasurements?.map((measurement, index) => {
    // Week 0 is the first/oldest entry (baseline), then Week 1, 2, etc.
    const weekNum = bodyMeasurements.length - 1 - index;
    return {
      rawDate: measurement.date, // Keep raw date for editing
      date: new Date(measurement.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      weekNumber: weekNum,
      measurements: {
        chest: parseFloat(measurement.chest || '0'),
        waist: parseFloat(measurement.waist || '0'),
        hip: parseFloat(measurement.hips || '0'),
        thigh: parseFloat(measurement.thighs || '0'),
        arm: parseFloat(measurement.arms || '0'),
        // NOTE: Weight comes from check-ins logic usually, but here we just show what might be in body_measurements or skip it
        // Since we removed weight from dialog and it's handled in check-ins, we might not show it here if it's not in DB
        // But the previous implementation mapped it. Assuming undefined if not present.
      },
    };
  }) || [];

  // Transform measurements for progress chart
  // Week 0 is the first entry (baseline), then Week 1, 2, etc.
  const progressData = bodyMeasurements?.slice().reverse().map((measurement, index) => ({
    week: `W${index}`,
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
      week: (bodyMeasurements?.length || 1) - 1, // Latest week number (0-indexed)
      date: new Date(currentMeasurement.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      chest: parseFloat(currentMeasurement.chest || '0'),
      waist: parseFloat(currentMeasurement.waist || '0'),
      hip: parseFloat(currentMeasurement.hips || '0'),
      thigh: parseFloat(currentMeasurement.thighs || '0'),
      arm: parseFloat(currentMeasurement.arms || '0'),
    },
    start: {
      week: 0, // Week 0 = Baseline
      date: new Date(startMeasurement.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      chest: parseFloat(startMeasurement.chest || '0'),
      waist: parseFloat(startMeasurement.waist || '0'),
      hip: parseFloat(startMeasurement.hips || '0'),
      thigh: parseFloat(startMeasurement.thighs || '0'),
      arm: parseFloat(startMeasurement.arms || '0'),
    },
  } : null;

  // Fetch daily check-ins for weight metrics
  const { data: checkIns } = useQuery({
    queryKey: ['dailyCheckIns', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      const { data, error } = await supabase
        .from('daily_check_ins')
        .select('*')
        .eq('user_id', targetUserId);
      if (error) throw error;
      return data;
    },
    enabled: !!targetUserId,
  });

  // Calculate metrics from check-ins
  const weeklyAverages = checkIns ? calculateWeeklyAverages(checkIns) : [];
  const totalWeeks = weeklyAverages.length || 0;

  // Calculate weight metrics
  let totalWeightLost = '0';
  let avgWeeklyLoss = '0';

  if (checkIns && checkIns.length > 0) {
    // Sort chronologically for metric calculation
    const sortedByDate = [...checkIns].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Find first and last valid weight entries
    const firstWeightEntry = sortedByDate.find(c => c.morning_weight && parseFloat(c.morning_weight.toString()) > 0);

    // Reverse to find last valid entry
    const lastWeightEntry = [...sortedByDate].reverse().find(c => c.morning_weight && parseFloat(c.morning_weight.toString()) > 0);

    if (firstWeightEntry?.morning_weight && lastWeightEntry?.morning_weight) {
      const startWeight = parseFloat(firstWeightEntry.morning_weight.toString());
      const currentWeight = parseFloat(lastWeightEntry.morning_weight.toString());

      const lost = startWeight - currentWeight;
      totalWeightLost = lost.toFixed(1);

      // Use week count from our averages logic, or default to 1 if very short duration
      const weeksDivisor = totalWeeks > 0 ? totalWeeks : 1;
      avgWeeklyLoss = (lost / weeksDivisor).toFixed(1);
    }
  }

  // Waist reduction still relies on manual logs
  const waistReduction = currentMeasurement && startMeasurement
    ? (parseFloat(startMeasurement.waist || '0') - parseFloat(currentMeasurement.waist || '0')).toFixed(0)
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold mb-2" data-testid="text-measurements-title">Body Measurements & Progress</h1>
          <p className="text-sm md:text-base text-muted-foreground">Track your body composition changes and transformation analytics</p>
        </div>
        {!viewedUserId && (
          <Button className="rounded-xl w-full md:w-auto" onClick={handleAddMeasurement} data-testid="button-log-measurement">
            <Plus className="w-4 h-4 mr-2" />
            Log Measurement
          </Button>
        )}
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
            <MeasurementCard
              key={index}
              {...measurement}
              onEdit={!viewedUserId ? () => handleEditMeasurement(measurement.rawDate) : undefined}
            />
          ))}
        </div>
      </div>

      <MeasurementDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        selectedDate={selectedDate}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
