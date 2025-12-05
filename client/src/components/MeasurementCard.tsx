import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface MeasurementCardProps {
  date: string;
  weekNumber: number;
  measurements: {
    weight: number;
    chest?: number;
    waist?: number;
    hip?: number;
    thigh?: number;
    arm?: number;
  };
  changes?: {
    weight: number;
  };
}

export function MeasurementCard({ date, weekNumber, measurements, changes }: MeasurementCardProps) {
  const renderChange = (value: number | undefined) => {
    if (!value || value === 0) return <Minus className="w-3 h-3 text-muted-foreground" />;
    if (value < 0) return (
      <div className="flex items-center gap-1 text-success">
        <TrendingDown className="w-3 h-3" />
        <span className="text-xs font-semibold">{Math.abs(value).toFixed(1)} kg</span>
      </div>
    );
    return (
      <div className="flex items-center gap-1 text-primary">
        <TrendingUp className="w-3 h-3" />
        <span className="text-xs font-semibold">+{value.toFixed(1)} kg</span>
      </div>
    );
  };

  return (
    <Card className="p-6 rounded-2xl hover-elevate" data-testid={`card-measurement-week-${weekNumber}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold">Week {weekNumber}</h3>
            <Badge variant="outline" className="rounded-full">
              {date}
            </Badge>
          </div>
        </div>
        {changes && renderChange(changes.weight)}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Weight</p>
          <p className="text-2xl font-bold font-poppins" data-testid="text-weight-value">{measurements.weight} kg</p>
        </div>
        {measurements.chest && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Chest</p>
            <p className="text-lg font-semibold font-poppins">{measurements.chest} cm</p>
          </div>
        )}
        {measurements.waist && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Waist</p>
            <p className="text-lg font-semibold font-poppins">{measurements.waist} cm</p>
          </div>
        )}
        {measurements.hip && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Hip</p>
            <p className="text-lg font-semibold font-poppins">{measurements.hip} cm</p>
          </div>
        )}
        {measurements.thigh && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Thigh</p>
            <p className="text-lg font-semibold font-poppins">{measurements.thigh} cm</p>
          </div>
        )}
        {measurements.arm && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Arm</p>
            <p className="text-lg font-semibold font-poppins">{measurements.arm} cm</p>
          </div>
        )}
      </div>
    </Card>
  );
}
