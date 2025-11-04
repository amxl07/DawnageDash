import { Card } from "@/components/ui/card";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from "recharts";

interface BodyMetrics {
  current: { strength: number; endurance: number; flexibility: number; power: number; balance: number };
  start: { strength: number; endurance: number; flexibility: number; power: number; balance: number };
}

interface BodyCompositionRadarProps {
  data: BodyMetrics;
}

export function BodyCompositionRadar({ data }: BodyCompositionRadarProps) {
  const chartData = [
    { metric: 'Strength', current: data.current.strength, start: data.start.strength },
    { metric: 'Endurance', current: data.current.endurance, start: data.start.endurance },
    { metric: 'Flexibility', current: data.current.flexibility, start: data.start.flexibility },
    { metric: 'Power', current: data.current.power, start: data.start.power },
    { metric: 'Balance', current: data.current.balance, start: data.start.balance },
  ];

  return (
    <Card className="p-6 rounded-2xl" data-testid="card-body-composition-radar">
      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-1">Fitness Profile Comparison</h3>
        <p className="text-sm text-muted-foreground">See how you've improved across all fitness dimensions</p>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <RadarChart data={chartData}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis 
            dataKey="metric" 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 10]}
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '10px' }}
          />
          <Radar 
            name="Current" 
            dataKey="current" 
            stroke="hsl(var(--chart-2))" 
            fill="hsl(var(--chart-2))" 
            fillOpacity={0.5}
            strokeWidth={2}
          />
          <Radar 
            name="Start" 
            dataKey="start" 
            stroke="hsl(var(--chart-1))" 
            fill="hsl(var(--chart-1))" 
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </Card>
  );
}
