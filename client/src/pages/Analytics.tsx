import { Card } from "@/components/ui/card";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Bar } from "recharts";
import { BodyCompositionRadar } from "@/components/BodyCompositionRadar";
import { GoalProgressCard } from "@/components/GoalProgressCard";
import { InteractiveMetricsGrid } from "@/components/InteractiveMetricsGrid";
import { TrendingDown, TrendingUp, Activity, Heart, Zap, Droplet, Target, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Analytics() {
  // TODO: Remove mock data - fetch from Supabase
  const energyVsStressData = [
    { week: 'W1', energy: 7, stress: 6, sleep: 7.2 },
    { week: 'W2', energy: 7.5, stress: 5, sleep: 7.5 },
    { week: 'W3', energy: 8, stress: 4, sleep: 7.8 },
    { week: 'W4', energy: 8.5, stress: 3, sleep: 8.0 },
    { week: 'W5', energy: 8.2, stress: 3.5, sleep: 7.6 },
    { week: 'W6', energy: 9, stress: 2, sleep: 8.2 },
  ];

  const nutritionTrendData = [
    { week: 'W1', score: 7.5, protein: 140, carbs: 190, fats: 55 },
    { week: 'W2', score: 8, protein: 145, carbs: 195, fats: 58 },
    { week: 'W3', score: 8.5, protein: 148, carbs: 200, fats: 60 },
    { week: 'W4', score: 9, protein: 151, carbs: 207, fats: 63 },
    { week: 'W5', score: 8.7, protein: 150, carbs: 205, fats: 62 },
    { week: 'W6', score: 9.2, protein: 153, carbs: 210, fats: 65 },
  ];

  const performanceTrendData = [
    { week: 'W1', strength: 7, endurance: 6, flexibility: 5, avgWorkoutTime: 45 },
    { week: 'W2', strength: 7.5, endurance: 6.5, flexibility: 5.5, avgWorkoutTime: 48 },
    { week: 'W3', strength: 8, endurance: 7, flexibility: 6, avgWorkoutTime: 50 },
    { week: 'W4', strength: 8.5, endurance: 7.5, flexibility: 6.5, avgWorkoutTime: 52 },
    { week: 'W5', strength: 9, endurance: 8, flexibility: 7, avgWorkoutTime: 55 },
    { week: 'W6', strength: 9.5, endurance: 8.5, flexibility: 7.5, avgWorkoutTime: 58 },
  ];

  const bodyMetrics = {
    current: { strength: 9.5, endurance: 8.5, flexibility: 7.5, power: 8.5, balance: 8.0 },
    start: { strength: 7.0, endurance: 6.0, flexibility: 5.0, power: 6.5, balance: 6.5 },
  };

  const goals = [
    {
      id: 'weight-loss',
      title: 'Reach Target Weight',
      category: 'Weight Management',
      target: 75,
      current: 78.5,
      unit: 'kg',
      deadline: 'End of Feb',
      progress: 72,
      isOnTrack: true,
    },
    {
      id: 'strength',
      title: 'Increase Bench Press',
      category: 'Strength Training',
      target: 100,
      current: 85,
      unit: 'kg',
      deadline: 'End of Mar',
      progress: 85,
      isOnTrack: true,
    },
    {
      id: 'endurance',
      title: 'Run 5K Under 25min',
      category: 'Cardio',
      target: 25,
      current: 27.5,
      unit: 'minutes',
      deadline: 'End of Feb',
      progress: 65,
      isOnTrack: false,
    },
  ];

  const metrics = [
    {
      id: 'resting-hr',
      name: 'Resting Heart Rate',
      value: 58,
      unit: 'bpm',
      change: -5.2,
      changeType: 'decrease' as const,
      isGood: true,
      icon: <Heart className="w-5 h-5 text-primary" />,
      color: 'bg-primary/10',
      details: [
        { label: 'Morning Avg', value: '56 bpm' },
        { label: 'Evening Avg', value: '60 bpm' },
        { label: '4-week trend', value: 'Improving' },
      ],
    },
    {
      id: 'active-calories',
      name: 'Active Calories',
      value: 520,
      unit: 'kcal/day',
      change: 18.5,
      changeType: 'increase' as const,
      isGood: true,
      icon: <Activity className="w-5 h-5 text-success" />,
      color: 'bg-success/10',
      details: [
        { label: 'Workout Days', value: '680 kcal' },
        { label: 'Rest Days', value: '280 kcal' },
        { label: 'Weekly Total', value: '3,640 kcal' },
      ],
    },
    {
      id: 'vo2-max',
      name: 'VO2 Max Estimate',
      value: 48,
      unit: 'ml/kg/min',
      change: 9.1,
      changeType: 'increase' as const,
      isGood: true,
      icon: <Zap className="w-5 h-5 text-gold" />,
      color: 'bg-gold/10',
      details: [
        { label: 'Fitness Level', value: 'Good' },
        { label: 'Improvement', value: '+4 pts' },
        { label: 'Target', value: '52 ml/kg/min' },
      ],
    },
    {
      id: 'hydration',
      name: 'Hydration Level',
      value: 2.7,
      unit: 'L/day',
      change: 22.7,
      changeType: 'increase' as const,
      isGood: true,
      icon: <Droplet className="w-5 h-5 text-primary" />,
      color: 'bg-primary/10',
      details: [
        { label: 'Daily Goal', value: '3.0 L' },
        { label: 'Compliance', value: '90%' },
        { label: 'Best Day', value: '3.2 L' },
      ],
    },
    {
      id: 'muscle-gain',
      name: 'Estimated Muscle Mass',
      value: 62,
      unit: 'kg',
      change: 3.3,
      changeType: 'increase' as const,
      isGood: true,
      icon: <Target className="w-5 h-5 text-success" />,
      color: 'bg-success/10',
      details: [
        { label: 'Body Fat %', value: '14.2%' },
        { label: 'Lean Mass', value: '67.3 kg' },
        { label: '4-week change', value: '+2.1 kg' },
      ],
    },
    {
      id: 'recovery',
      name: 'Recovery Score',
      value: 87,
      unit: '/100',
      change: 12.4,
      changeType: 'increase' as const,
      isGood: true,
      icon: <Award className="w-5 h-5 text-gold" />,
      color: 'bg-gold/10',
      details: [
        { label: 'Sleep Quality', value: '92%' },
        { label: 'HRV', value: '65 ms' },
        { label: 'Stress Level', value: 'Low' },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2" data-testid="text-analytics-title">Advanced Analytics</h1>
          <p className="text-muted-foreground">Deep insights into your fitness journey with interactive visualizations and performance patterns</p>
        </div>
        <Badge className="rounded-full text-sm px-4 py-2 bg-success">
          <TrendingUp className="w-4 h-4 mr-2" />
          96% Adherence Rate
        </Badge>
      </div>

      <InteractiveMetricsGrid metrics={metrics} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BodyCompositionRadar data={bodyMetrics} />
        </div>
        <GoalProgressCard goals={goals} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 rounded-2xl">
          <div className="mb-6">
            <h3 className="text-2xl font-bold mb-1">Energy, Stress & Sleep Correlation</h3>
            <p className="text-sm text-muted-foreground">Understand how your wellbeing metrics influence each other</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={energyVsStressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis stroke="hsl(var(--muted-foreground))" dataKey="week" style={{ fontSize: '12px' }} />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} domain={[0, 10]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="energy" stroke="hsl(var(--chart-2))" strokeWidth={3} name="Energy Level" />
              <Line type="monotone" dataKey="stress" stroke="hsl(var(--chart-1))" strokeWidth={3} name="Stress Level" />
              <Line type="monotone" dataKey="sleep" stroke="hsl(var(--chart-3))" strokeWidth={3} name="Sleep Hours" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 rounded-2xl">
          <div className="mb-6">
            <h3 className="text-2xl font-bold mb-1">Nutrition Quality Trends</h3>
            <p className="text-sm text-muted-foreground">Weekly nutrition score and macro consistency</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={nutritionTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis stroke="hsl(var(--muted-foreground))" dataKey="week" style={{ fontSize: '12px' }} />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Legend />
              <Bar dataKey="score" fill="hsl(var(--chart-3))" radius={[8, 8, 0, 0]} name="Nutrition Score" />
              <Line type="monotone" dataKey="protein" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Protein (g)" />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6 rounded-2xl">
        <div className="mb-6">
          <h3 className="text-2xl font-bold mb-1">Performance Evolution & Training Volume</h3>
          <p className="text-sm text-muted-foreground">Track your improvements across all fitness metrics and workout duration</p>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={performanceTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis stroke="hsl(var(--muted-foreground))" dataKey="week" style={{ fontSize: '12px' }} />
            <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} domain={[0, 10]} />
            <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
              }}
            />
            <Legend />
            <Bar yAxisId="right" dataKey="avgWorkoutTime" fill="hsl(var(--chart-4) / 0.3)" radius={[8, 8, 0, 0]} name="Avg Workout (min)" />
            <Line yAxisId="left" type="monotone" dataKey="strength" stroke="hsl(var(--chart-1))" strokeWidth={3} name="Strength" />
            <Line yAxisId="left" type="monotone" dataKey="endurance" stroke="hsl(var(--chart-2))" strokeWidth={3} name="Endurance" />
            <Line yAxisId="left" type="monotone" dataKey="flexibility" stroke="hsl(var(--chart-3))" strokeWidth={3} name="Flexibility" />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
