import { Card } from "@/components/ui/card";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingDown, TrendingUp, Activity, Heart } from "lucide-react";

export default function Analytics() {
  const energyVsStressData = [
    { week: 'W1', energy: 7, stress: 6 },
    { week: 'W2', energy: 7.5, stress: 5 },
    { week: 'W3', energy: 8, stress: 4 },
    { week: 'W4', energy: 8.5, stress: 3 },
    { week: 'W5', energy: 8.2, stress: 3.5 },
    { week: 'W6', energy: 9, stress: 2 },
  ];

  const nutritionTrendData = [
    { week: 'W1', score: 7.5, calories: 2100 },
    { week: 'W2', score: 8, calories: 2050 },
    { week: 'W3', score: 8.5, calories: 2000 },
    { week: 'W4', score: 9, calories: 1950 },
    { week: 'W5', score: 8.7, calories: 2000 },
    { week: 'W6', score: 9.2, calories: 1980 },
  ];

  const performanceTrendData = [
    { week: 'W1', strength: 7, endurance: 6, flexibility: 5 },
    { week: 'W2', strength: 7.5, endurance: 6.5, flexibility: 5.5 },
    { week: 'W3', strength: 8, endurance: 7, flexibility: 6 },
    { week: 'W4', strength: 8.5, endurance: 7.5, flexibility: 6.5 },
    { week: 'W5', strength: 9, endurance: 8, flexibility: 7 },
    { week: 'W6', strength: 9.5, endurance: 8.5, flexibility: 7.5 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2" data-testid="text-analytics-title">Advanced Analytics</h1>
        <p className="text-muted-foreground">Deep insights into your fitness journey and performance patterns</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-success/10">
              <TrendingDown className="w-6 h-6 text-success" />
            </div>
            <div className="text-success font-semibold">-4.0 kg</div>
          </div>
          <h3 className="text-sm text-muted-foreground mb-1">Weight Lost</h3>
          <p className="text-2xl font-bold font-poppins">Last 6 Weeks</p>
        </Card>

        <Card className="p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <div className="text-primary font-semibold">+22%</div>
          </div>
          <h3 className="text-sm text-muted-foreground mb-1">Strength Gain</h3>
          <p className="text-2xl font-bold font-poppins">Since Start</p>
        </Card>

        <Card className="p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-gold/10">
              <Heart className="w-6 h-6 text-gold" />
            </div>
            <div className="text-gold font-semibold">96%</div>
          </div>
          <h3 className="text-sm text-muted-foreground mb-1">Plan Adherence</h3>
          <p className="text-2xl font-bold font-poppins">This Month</p>
        </Card>

        <Card className="p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-success/10">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
            <div className="text-success font-semibold">+1.8</div>
          </div>
          <h3 className="text-sm text-muted-foreground mb-1">Energy Boost</h3>
          <p className="text-2xl font-bold font-poppins">Average</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 rounded-2xl">
          <div className="mb-6">
            <h3 className="text-2xl font-bold mb-1">Energy vs Stress Levels</h3>
            <p className="text-sm text-muted-foreground">Correlation analysis over time</p>
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
              <Line type="monotone" dataKey="energy" stroke="hsl(var(--chart-2))" strokeWidth={3} name="Energy" />
              <Line type="monotone" dataKey="stress" stroke="hsl(var(--chart-1))" strokeWidth={3} name="Stress" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 rounded-2xl">
          <div className="mb-6">
            <h3 className="text-2xl font-bold mb-1">Nutrition Trends</h3>
            <p className="text-sm text-muted-foreground">Score and calorie tracking</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={nutritionTrendData}>
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
              <Area type="monotone" dataKey="score" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3) / 0.2)" strokeWidth={3} name="Nutrition Score" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6 rounded-2xl">
        <div className="mb-6">
          <h3 className="text-2xl font-bold mb-1">Performance Evolution</h3>
          <p className="text-sm text-muted-foreground">Track your improvements across all metrics</p>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={performanceTrendData}>
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
            <Area type="monotone" dataKey="strength" stackId="1" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1) / 0.6)" strokeWidth={2} name="Strength" />
            <Area type="monotone" dataKey="endurance" stackId="2" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2) / 0.6)" strokeWidth={2} name="Endurance" />
            <Area type="monotone" dataKey="flexibility" stackId="3" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3) / 0.6)" strokeWidth={2} name="Flexibility" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
