import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface MeasurementDataPoint {
  week: string;
  weight: number;
  chest?: number;
  waist?: number;
  hip?: number;
  thigh?: number;
  arm?: number;
}

interface MeasurementProgressChartProps {
  data: MeasurementDataPoint[];
}

export function MeasurementProgressChart({ data }: MeasurementProgressChartProps) {
  return (
    <Card className="p-6 rounded-2xl" data-testid="card-measurement-progress">
      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-1">Body Composition Trends</h3>
        <p className="text-sm text-muted-foreground">Track changes across all measurement points</p>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data}>
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
          <Line type="monotone" dataKey="weight" stroke="hsl(var(--chart-1))" strokeWidth={3} name="Weight (kg)" dot={{ r: 5 }} />
          <Line type="monotone" dataKey="waist" stroke="hsl(var(--chart-2))" strokeWidth={3} name="Waist (cm)" dot={{ r: 5 }} />
          <Line type="monotone" dataKey="chest" stroke="hsl(var(--chart-3))" strokeWidth={3} name="Chest (cm)" dot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
