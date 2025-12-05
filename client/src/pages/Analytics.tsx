import { Card } from "@/components/ui/card";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Bar } from "recharts";
import { TrendingDown, TrendingUp, Activity, Heart, Scale, Target, Calendar, Award, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";

export default function Analytics() {
  const { user } = useAuth();

  // Fetch Daily Check-ins
  const { data: checkIns, isLoading: loadingCheckIns } = useQuery({
    queryKey: ['analytics-checkins', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_check_ins')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch Body Measurements
  const { data: measurements, isLoading: loadingMeasurements } = useQuery({
    queryKey: ['analytics-measurements', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch User Goals
  const { data: goals, isLoading: loadingGoals } = useQuery({
    queryKey: ['analytics-goals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch Workout Logs
  const { data: workoutLogs, isLoading: loadingWorkouts } = useQuery({
    queryKey: ['analytics-workouts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Process data for charts
  const processedData = useMemo(() => {
    if (!checkIns || !measurements) return null;

    // Weight progress trend
    const weightTrend = measurements.map(m => ({
      date: new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weight: parseFloat(m.weight || '0'),
      bodyFat: parseFloat(m.body_fat_percentage || '0'),
      muscleMass: parseFloat(m.muscle_mass || '0'),
    }));

    // Energy, Stress, Sleep correlation (from check-ins)
    const wellbeingData = checkIns.slice(-30).map(c => ({
      date: new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      energy: c.energy_level || 0,
      stress: c.stress_level || 0,
      sleep: parseFloat(c.sleep_hours || '0'),
    }));

    // Nutrition trends (from check-ins)
    const nutritionData = checkIns.slice(-30).map(c => ({
      date: new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: c.nutrition_score || 0,
      protein: parseFloat(c.protein || '0'),
      carbs: parseFloat(c.carbs || '0'),
      fats: parseFloat(c.fats || '0'),
      calories: c.calorie_intake || 0,
    }));

    // Workout performance trend
    const workoutPerformance = checkIns
      .filter(c => c.workout_status === 'done' && c.workout_performance)
      .slice(-30)
      .map(c => ({
        date: new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        performance: c.workout_performance || 0,
      }));

    return {
      weightTrend,
      wellbeingData,
      nutritionData,
      workoutPerformance,
    };
  }, [checkIns, measurements]);

  // Calculate summary metrics
  const metrics = useMemo(() => {
    if (!checkIns || !measurements) return null;

    const recentCheckIns = checkIns.slice(-7);
    const avgEnergy = recentCheckIns.reduce((sum, c) => sum + (c.energy_level || 0), 0) / (recentCheckIns.length || 1);
    const avgStress = recentCheckIns.reduce((sum, c) => sum + (c.stress_level || 0), 0) / (recentCheckIns.length || 1);
    const avgSleep = recentCheckIns.reduce((sum, c) => sum + parseFloat(c.sleep_hours || '0'), 0) / (recentCheckIns.length || 1);
    const avgWater = recentCheckIns.reduce((sum, c) => sum + parseFloat(c.water_liters || '0'), 0) / (recentCheckIns.length || 1);
    const avgNutrition = recentCheckIns.reduce((sum, c) => sum + (c.nutrition_score || 0), 0) / (recentCheckIns.length || 1);

    const workoutCount = recentCheckIns.filter(c => c.workout_status === 'done').length;
    const adherenceRate = (workoutCount / 7) * 100;

    const latestWeight = measurements.length > 0 ? parseFloat(measurements[measurements.length - 1].weight || '0') : 0;
    const firstWeight = measurements.length > 0 ? parseFloat(measurements[0].weight || '0') : 0;
    const weightChange = latestWeight - firstWeight;

    const latestBodyFat = measurements.length > 0 ? parseFloat(measurements[measurements.length - 1].body_fat_percentage || '0') : 0;
    const latestMuscleMass = measurements.length > 0 ? parseFloat(measurements[measurements.length - 1].muscle_mass || '0') : 0;

    return {
      avgEnergy: avgEnergy.toFixed(1),
      avgStress: avgStress.toFixed(1),
      avgSleep: avgSleep.toFixed(1),
      avgWater: avgWater.toFixed(1),
      avgNutrition: avgNutrition.toFixed(1),
      workoutCount,
      adherenceRate: adherenceRate.toFixed(0),
      latestWeight: latestWeight.toFixed(1),
      weightChange: weightChange.toFixed(1),
      latestBodyFat: latestBodyFat.toFixed(1),
      latestMuscleMass: latestMuscleMass.toFixed(1),
      totalCheckIns: checkIns.length,
      totalMeasurements: measurements.length,
      totalWorkouts: workoutLogs?.length || 0,
    };
  }, [checkIns, measurements, workoutLogs]);

  if (loadingCheckIns || loadingMeasurements || loadingGoals || loadingWorkouts) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!processedData || !metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No data available yet. Start logging your check-ins and measurements!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-analytics-title">Advanced Analytics</h1>
          <p className="text-muted-foreground">Insights from your fitness journey</p>
        </div>
        {metrics.adherenceRate && (
          <Badge variant={Number(metrics.adherenceRate) >= 80 ? "default" : "secondary"} className="text-sm px-4 py-2">
            <TrendingUp className="w-4 h-4 mr-2" />
            {metrics.adherenceRate}% Adherence
          </Badge>
        )}
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Workouts</p>
              <p className="text-2xl font-bold">{metrics.workoutCount}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Last 7 days</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Scale className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Weight</p>
              <p className="text-2xl font-bold">{metrics.latestWeight}kg</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {Number(metrics.weightChange) < 0 ? (
              <><TrendingDown className="w-3 h-3 text-success" /> {metrics.weightChange}kg</>
            ) : (
              <><TrendingUp className="w-3 h-3" /> +{metrics.weightChange}kg</>
            )}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Avg Energy</p>
              <p className="text-2xl font-bold">{metrics.avgEnergy}/10</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Weekly average</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Total Logs</p>
              <p className="text-2xl font-bold">{metrics.totalCheckIns}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Check-ins recorded</p>
        </Card>
      </div>

      {/* Weight Progress */}
      {processedData.weightTrend.length > 0 && (
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-1">Weight & Body Composition</h3>
            <p className="text-sm text-muted-foreground">Track your physical transformation over time</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={processedData.weightTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis stroke="hsl(var(--muted-foreground))" dataKey="date" style={{ fontSize: '12px' }} />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="weight" stroke="hsl(var(--chart-1))" strokeWidth={3} name="Weight (kg)" />
              {processedData.weightTrend.some(d => d.bodyFat > 0) && (
                <Line type="monotone" dataKey="bodyFat" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Body Fat %" />
              )}
              {processedData.weightTrend.some(d => d.muscleMass > 0) && (
                <Line type="monotone" dataKey="muscleMass" stroke="hsl(var(--chart-3))" strokeWidth={2} name="Muscle Mass (kg)" />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wellbeing Trends */}
        {processedData.wellbeingData.length > 0 && (
          <Card className="p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-1">Wellbeing Trends</h3>
              <p className="text-sm text-muted-foreground">Energy, stress, and sleep patterns</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={processedData.wellbeingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis stroke="hsl(var(--muted-foreground))" dataKey="date" style={{ fontSize: '12px' }} />
                <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} domain={[0, 10]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="energy" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Energy Level" />
                <Line type="monotone" dataKey="stress" stroke="hsl(var(--chart-1))" strokeWidth={2} name="Stress Level" />
                <Line type="monotone" dataKey="sleep" stroke="hsl(var(--chart-3))" strokeWidth={2} name="Sleep (hrs)" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Nutrition Trends */}
        {processedData.nutritionData.length > 0 && (
          <Card className="p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-1">Nutrition Tracking</h3>
              <p className="text-sm text-muted-foreground">Daily nutrition score and macros</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={processedData.nutritionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis stroke="hsl(var(--muted-foreground))" dataKey="date" style={{ fontSize: '12px' }} />
                <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="score" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} name="Nutrition Score" />
                <Line type="monotone" dataKey="protein" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Protein (g)" />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {/* Workout Performance */}
      {processedData.workoutPerformance.length > 0 && (
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-1">Workout Performance</h3>
            <p className="text-sm text-muted-foreground">Self-rated performance from completed workouts</p>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={processedData.workoutPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis stroke="hsl(var(--muted-foreground))" dataKey="date" style={{ fontSize: '12px' }} />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} domain={[0, 10]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Area type="monotone" dataKey="performance" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1) / 0.2)" name="Performance (1-10)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Goals Progress */}
      {goals && goals.length > 0 && (
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-1">Active Goals</h3>
            <p className="text-sm text-muted-foreground">Track progress towards your targets</p>
          </div>
          <div className="space-y-4">
            {goals.map((goal) => {
              const progress = goal.target_value && goal.current_value
                ? ((parseFloat(goal.current_value) / parseFloat(goal.target_value)) * 100).toFixed(0)
                : 0;

              return (
                <div key={goal.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Target className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-semibold">{goal.goal_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
                        <p className="text-sm text-muted-foreground">
                          {goal.current_value} / {goal.target_value}
                        </p>
                      </div>
                    </div>
                    <Badge variant={Number(progress) >= 80 ? "default" : "secondary"}>
                      {progress}%
                    </Badge>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(Number(progress), 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
