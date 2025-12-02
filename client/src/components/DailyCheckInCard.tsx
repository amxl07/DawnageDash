import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Weight, Activity, Apple, Droplet, Moon, Zap, Brain, TrendingUp, TrendingDown } from "lucide-react";

interface CheckInData {
  date: string;
  dayNumber: number;
  vitals: {
    morningWeight: number;
    sleepHours: number;
    weightChange?: number;
  };
  workout: {
    status: 'done' | 'no' | 'cardio_day' | 'rest_day';
    performance?: number;
  };
  nutrition: {
    score: number;
    calorieIntake: number;
    waterLiters: number;
    dailySteps: number;
  };
  wellbeing: {
    energyLevel: number;
    hungerLevel: number;
    stressLevel: number;
    digestion: 'none' | 'bloated' | 'constipated' | 'diarrhea';
  };
}

interface DailyCheckInCardProps {
  data: CheckInData;
}

export function DailyCheckInCard({ data }: DailyCheckInCardProps) {
  const getWorkoutBadge = () => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline'; color: string }> = {
      done: { label: 'Completed', variant: 'default' as const, color: 'bg-success' },
      no: { label: 'Missed', variant: 'destructive' as const, color: 'bg-primary' },
      cardio_day: { label: 'Cardio', variant: 'secondary' as const, color: 'bg-gold' },
      rest_day: { label: 'Rest Day', variant: 'outline' as const, color: 'bg-muted' },
    };
    const config = statusConfig[data.workout.status] || statusConfig['no'];
    return (
      <Badge variant={config.variant} className="rounded-full">
        {config.label}
      </Badge>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-success';
    if (score >= 6) return 'text-gold';
    return 'text-primary';
  };

  return (
    <Card className="p-6 rounded-2xl hover-elevate" data-testid={`card-checkin-day-${data.dayNumber}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold">Day {data.dayNumber}</h3>
            <Badge variant="outline" className="rounded-full text-xs">
              {data.date}
            </Badge>
          </div>
        </div>
        {getWorkoutBadge()}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
            <div className="p-2 rounded-lg bg-primary/10">
              <Weight className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Weight</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold font-poppins">{data.vitals.morningWeight} kg</p>
                {data.vitals.weightChange && (
                  <span className={`text-xs font-semibold flex items-center ${data.vitals.weightChange < 0 ? 'text-success' : 'text-primary'}`}>
                    {data.vitals.weightChange < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                    {Math.abs(data.vitals.weightChange)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
            <div className="p-2 rounded-lg bg-gold/10">
              <Moon className="w-4 h-4 text-gold" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sleep</p>
              <p className="text-lg font-bold font-poppins">{data.vitals.sleepHours}h</p>
            </div>
          </div>

          {data.workout.performance && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Performance</p>
                <p className={`text-lg font-bold font-poppins ${getScoreColor(data.workout.performance)}`}>
                  {data.workout.performance}/10
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
            <div className="p-2 rounded-lg bg-success/10">
              <Apple className="w-4 h-4 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Nutrition</p>
              <p className={`text-lg font-bold font-poppins ${getScoreColor(data.nutrition.score)}`}>
                {data.nutrition.score}/10
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <div className="flex items-center justify-center mb-1">
              <Droplet className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mb-1">Water</p>
            <p className="text-sm font-semibold font-poppins">{data.nutrition.waterLiters}L</p>
          </div>
          <div>
            <div className="flex items-center justify-center mb-1">
              <Activity className="w-4 h-4 text-success" />
            </div>
            <p className="text-xs text-muted-foreground mb-1">Steps</p>
            <p className="text-sm font-semibold font-poppins">{data.nutrition.dailySteps.toLocaleString()}</p>
          </div>
          <div>
            <div className="flex items-center justify-center mb-1">
              <Zap className="w-4 h-4 text-gold" />
            </div>
            <p className="text-xs text-muted-foreground mb-1">Energy</p>
            <p className={`text-sm font-semibold font-poppins ${getScoreColor(data.wellbeing.energyLevel)}`}>
              {data.wellbeing.energyLevel}/10
            </p>
          </div>
          <div>
            <div className="flex items-center justify-center mb-1">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mb-1">Stress</p>
            <p className={`text-sm font-semibold font-poppins ${data.wellbeing.stressLevel <= 3 ? 'text-success' : data.wellbeing.stressLevel <= 6 ? 'text-gold' : 'text-primary'}`}>
              {data.wellbeing.stressLevel}/10
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
