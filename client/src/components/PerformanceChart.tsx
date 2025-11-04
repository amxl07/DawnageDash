import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface PerformanceDataPoint {
  day: string;
  performance: number;
  nutrition: number;
  energy: number;
}

interface PerformanceChartProps {
  data: PerformanceDataPoint[];
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  return (
    <Card className="p-6 rounded-2xl" data-testid="card-performance-chart">
      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-1">Weekly Performance</h3>
        <p className="text-sm text-muted-foreground">Daily scores across key metrics</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="day" 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
            domain={[0, 10]}
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
          <Bar dataKey="performance" fill="hsl(var(--chart-1))" radius={[8, 8, 0, 0]} name="Performance" />
          <Bar dataKey="nutrition" fill="hsl(var(--chart-2))" radius={[8, 8, 0, 0]} name="Nutrition" />
          <Bar dataKey="energy" fill="hsl(var(--chart-3))" radius={[8, 8, 0, 0]} name="Energy" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
