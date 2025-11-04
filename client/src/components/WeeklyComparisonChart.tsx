import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface WeekData {
  week: string;
  workouts: number;
  avgNutrition: number;
  avgEnergy: number;
  avgSleep: number;
}

interface WeeklyComparisonChartProps {
  data: WeekData[];
}

export function WeeklyComparisonChart({ data }: WeeklyComparisonChartProps) {
  return (
    <Card className="p-6 rounded-2xl" data-testid="card-weekly-comparison">
      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-1">Weekly Performance Comparison</h3>
        <p className="text-sm text-muted-foreground">Track your consistency and improvements week by week</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="week" 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              color: 'hsl(var(--foreground))',
            }}
          />
          <Legend />
          <Bar dataKey="workouts" fill="hsl(var(--chart-1))" radius={[8, 8, 0, 0]} name="Workouts Completed" />
          <Bar dataKey="avgNutrition" fill="hsl(var(--chart-2))" radius={[8, 8, 0, 0]} name="Avg Nutrition Score" />
          <Bar dataKey="avgEnergy" fill="hsl(var(--chart-3))" radius={[8, 8, 0, 0]} name="Avg Energy Level" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
