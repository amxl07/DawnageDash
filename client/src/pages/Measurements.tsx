import { useState } from "react";
import { MeasurementCard } from "@/components/MeasurementCard";
import { MeasurementProgressChart } from "@/components/MeasurementProgressChart";
import { MeasurementComparisonCard } from "@/components/MeasurementComparisonCard";
import { MetricCard } from "@/components/MetricCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TrendingDown, Ruler, Target, Plus, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Measurements() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    weight: "",
    chest: "",
    waist: "",
    hips: "",
    thighs: "",
    arms: "",
    date: new Date().toISOString().split('T')[0],
  });

  // Fetch measurements from Supabase
  const { data: bodyMeasurements, isLoading } = useQuery({
    queryKey: ['bodyMeasurements', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('body_measurements').insert({
        user_id: user.id,
        date: formData.date,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        chest: formData.chest ? parseFloat(formData.chest) : null,
        waist: formData.waist ? parseFloat(formData.waist) : null,
        hips: formData.hips ? parseFloat(formData.hips) : null,
        thighs: formData.thighs ? parseFloat(formData.thighs) : null,
        arms: formData.arms ? parseFloat(formData.arms) : null,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Measurements logged successfully!",
      });

      setIsDialogOpen(false);
      setFormData({
        weight: "",
        chest: "",
        waist: "",
        hips: "",
        thighs: "",
        arms: "",
        date: new Date().toISOString().split('T')[0],
      });
      queryClient.invalidateQueries({ queryKey: ['bodyMeasurements'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to log measurements",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Transform measurements for card display
  const measurements = bodyMeasurements?.map((measurement, index) => {
    const prevMeasurement = bodyMeasurements[index + 1];
    const weightChange = prevMeasurement
      ? parseFloat(measurement.weight || '0') - parseFloat(prevMeasurement.weight || '0')
      : 0;

    return {
      date: new Date(measurement.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      weekNumber: bodyMeasurements.length - index,
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



  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2" data-testid="text-measurements-title">Body Measurements & Progress</h1>
          <p className="text-muted-foreground">Track your body composition changes and transformation analytics</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl" data-testid="button-log-measurement">
              <Plus className="w-4 h-4 mr-2" />
              Log Measurement
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Log New Measurement</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chest">Chest (cm)</Label>
                  <Input
                    id="chest"
                    type="number"
                    step="0.1"
                    value={formData.chest}
                    onChange={(e) => setFormData({ ...formData, chest: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waist">Waist (cm)</Label>
                  <Input
                    id="waist"
                    type="number"
                    step="0.1"
                    value={formData.waist}
                    onChange={(e) => setFormData({ ...formData, waist: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hips">Hips (cm)</Label>
                  <Input
                    id="hips"
                    type="number"
                    step="0.1"
                    value={formData.hips}
                    onChange={(e) => setFormData({ ...formData, hips: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="thighs">Thighs (cm)</Label>
                  <Input
                    id="thighs"
                    type="number"
                    step="0.1"
                    value={formData.thighs}
                    onChange={(e) => setFormData({ ...formData, thighs: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="arms">Arms (cm)</Label>
                  <Input
                    id="arms"
                    type="number"
                    step="0.1"
                    value={formData.arms}
                    onChange={(e) => setFormData({ ...formData, arms: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full rounded-xl" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Measurement
              </Button>
            </form>
          </DialogContent>
        </Dialog>
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
