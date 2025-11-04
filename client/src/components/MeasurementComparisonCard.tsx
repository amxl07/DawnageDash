import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface ComparisonData {
  current: {
    week: number;
    date: string;
    weight: number;
    chest: number;
    waist: number;
    hip: number;
    thigh: number;
    arm: number;
  };
  start: {
    week: number;
    date: string;
    weight: number;
    chest: number;
    waist: number;
    hip: number;
    thigh: number;
    arm: number;
  };
}

interface MeasurementComparisonCardProps {
  data: ComparisonData;
}

export function MeasurementComparisonCard({ data }: MeasurementComparisonCardProps) {
  const calculateChange = (current: number, start: number) => {
    const diff = current - start;
    return {
      value: Math.abs(diff),
      isDecrease: diff < 0,
      percentage: ((diff / start) * 100).toFixed(1),
    };
  };

  const renderChange = (current: number, start: number, isWeightMetric: boolean = false) => {
    const change = calculateChange(current, start);
    
    if (change.value === 0) {
      return (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Minus className="w-4 h-4" />
          <span className="text-sm font-semibold">No change</span>
        </div>
      );
    }

    const isGood = isWeightMetric ? change.isDecrease : !change.isDecrease;
    const color = isGood ? 'text-success' : 'text-primary';

    return (
      <div className={`flex items-center gap-1 ${color}`}>
        {change.isDecrease ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
        <span className="text-sm font-semibold">
          {change.isDecrease ? '-' : '+'}{change.value.toFixed(1)} ({change.percentage}%)
        </span>
      </div>
    );
  };

  const measurements = [
    { label: 'Weight', current: data.current.weight, start: data.start.weight, unit: 'kg', isWeightMetric: true },
    { label: 'Chest', current: data.current.chest, start: data.start.chest, unit: 'cm', isWeightMetric: false },
    { label: 'Waist', current: data.current.waist, start: data.start.waist, unit: 'cm', isWeightMetric: true },
    { label: 'Hip', current: data.current.hip, start: data.start.hip, unit: 'cm', isWeightMetric: true },
    { label: 'Thigh', current: data.current.thigh, start: data.start.thigh, unit: 'cm', isWeightMetric: true },
    { label: 'Arm', current: data.current.arm, start: data.start.arm, unit: 'cm', isWeightMetric: false },
  ];

  return (
    <Card className="p-6 rounded-2xl" data-testid="card-measurement-comparison">
      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-2">Progress Comparison</h3>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="rounded-full">
            Week {data.start.week}: {data.start.date}
          </Badge>
          <span className="text-muted-foreground">→</span>
          <Badge className="rounded-full">
            Week {data.current.week}: {data.current.date}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {measurements.map((measurement) => (
          <div key={measurement.label} className="p-4 rounded-xl bg-muted/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">{measurement.label}</span>
              {renderChange(measurement.current, measurement.start, measurement.isWeightMetric)}
            </div>
            <div className="flex items-baseline gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Current</p>
                <p className="text-2xl font-bold font-poppins">
                  {measurement.current}
                  <span className="text-sm text-muted-foreground ml-1">{measurement.unit}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">Start</p>
                <p className="text-lg font-semibold text-muted-foreground font-poppins">
                  {measurement.start}
                  <span className="text-xs ml-1">{measurement.unit}</span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
