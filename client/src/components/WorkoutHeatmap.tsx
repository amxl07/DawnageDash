import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DayActivity {
  date: string;
  status: 'done' | 'missed' | 'rest' | 'none';
  intensity?: number;
}

interface WorkoutHeatmapProps {
  data: DayActivity[];
}

export function WorkoutHeatmap({ data }: WorkoutHeatmapProps) {
  const getColorClass = (status: DayActivity['status'], intensity?: number) => {
    if (status === 'done' && intensity) {
      if (intensity >= 8) return 'bg-success shadow-[0_0_10px_rgba(0,210,106,0.4)]';
      if (intensity >= 6) return 'bg-gold/80';
      return 'bg-gold/50';
    }
    if (status === 'missed') return 'bg-primary/50';
    if (status === 'rest') return 'bg-muted';
    return 'bg-card border border-border';
  };

  const getTooltipText = (day: DayActivity) => {
    if (day.status === 'done') return `Completed${day.intensity ? ` (${day.intensity}/10)` : ''}`;
    if (day.status === 'missed') return 'Missed';
    if (day.status === 'rest') return 'Rest Day';
    return 'No data';
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeks = 4;
  
  // Group data into weeks
  const groupedData: DayActivity[][] = [];
  for (let i = 0; i < weeks; i++) {
    groupedData.push(data.slice(i * 7, (i + 1) * 7));
  }

  return (
    <Card className="p-6 rounded-2xl" data-testid="card-workout-heatmap">
      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-1">Workout Activity Heatmap</h3>
        <p className="text-sm text-muted-foreground">Visualize your consistency and intensity over the past 4 weeks</p>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-8 gap-2 mb-4">
          <div className="text-xs text-muted-foreground"></div>
          {weekDays.map((day) => (
            <div key={day} className="text-xs text-muted-foreground text-center font-medium">
              {day}
            </div>
          ))}
        </div>

        {groupedData.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-8 gap-2">
            <div className="text-xs text-muted-foreground font-medium flex items-center">
              W{weekIndex + 1}
            </div>
            {week.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className={`aspect-square rounded-lg ${getColorClass(day.status, day.intensity)} flex items-center justify-center group relative cursor-pointer hover-elevate transition-all`}
                data-testid={`heatmap-day-${weekIndex}-${dayIndex}`}
                title={`${day.date}: ${getTooltipText(day)}`}
              >
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-border">
                  {day.date}: {getTooltipText(day)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-6 mt-6 pt-6 border-t">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-success"></div>
          <span className="text-xs text-muted-foreground">High Intensity</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gold/80"></div>
          <span className="text-xs text-muted-foreground">Medium Intensity</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary/50"></div>
          <span className="text-xs text-muted-foreground">Missed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-muted"></div>
          <span className="text-xs text-muted-foreground">Rest Day</span>
        </div>
      </div>
    </Card>
  );
}
