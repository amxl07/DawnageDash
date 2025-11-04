import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface NutritionBreakdownChartProps {
  protein: number;
  carbs: number;
  fats: number;
}

export function NutritionBreakdownChart({ protein, carbs, fats }: NutritionBreakdownChartProps) {
  const data = [
    { name: 'Protein', value: protein, color: 'hsl(var(--chart-2))' },
    { name: 'Carbs', value: carbs, color: 'hsl(var(--chart-3))' },
    { name: 'Fats', value: fats, color: 'hsl(var(--chart-1))' },
  ];

  const total = protein + carbs + fats;

  return (
    <Card className="p-6 rounded-2xl" data-testid="card-nutrition-breakdown">
      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-1">Macro Distribution</h3>
        <p className="text-sm text-muted-foreground">Average daily macronutrient breakdown</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="flex flex-col justify-center space-y-4">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="font-medium">{item.name}</span>
              </div>
              <div className="text-right">
                <p className="font-bold font-poppins">{item.value}g</p>
                <p className="text-xs text-muted-foreground">{((item.value / total) * 100).toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
