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

      <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12">
        {/* Chart Section */}
        <div className="h-[200px] w-[200px] md:h-[240px] md:w-[240px] relative shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="90%"
                paddingAngle={5}
                dataKey="value"
                stroke="none"
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
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
                itemStyle={{ fontWeight: 500 }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Central Label for visual balance */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total</span>
            <span className="text-xl md:text-2xl font-bold">{total}g</span>
          </div>
        </div>

        {/* Legend Section */}
        <div className="flex flex-col justify-center space-y-3 w-full max-w-[280px]">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-transparent hover:border-border/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-3 md:w-4 h-3 md:h-4 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                <span className="font-semibold text-sm md:text-base">{item.name}</span>
              </div>
              <div className="text-right">
                <div className="flex items-baseline justify-end gap-1">
                  <span className="font-bold text-sm md:text-base">{item.value}</span>
                  <span className="text-xs text-muted-foreground">g</span>
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground font-medium">
                  {total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
