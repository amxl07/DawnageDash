import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, Calendar } from "lucide-react";

interface Goal {
  id: string;
  title: string;
  category: string;
  target: number;
  current: number;
  unit: string;
  deadline: string;
  progress: number;
  isOnTrack: boolean;
}

interface GoalProgressCardProps {
  goals: Goal[];
}

export function GoalProgressCard({ goals }: GoalProgressCardProps) {
  return (
    <Card className="p-6 rounded-2xl" data-testid="card-goal-progress">
      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-1">Goal Tracking</h3>
        <p className="text-sm text-muted-foreground">Monitor your progress towards fitness milestones</p>
      </div>

      <div className="space-y-6">
        {goals.map((goal) => (
          <div key={goal.id} className="space-y-3" data-testid={`goal-${goal.id}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold">{goal.title}</h4>
                </div>
                <Badge variant="outline" className="rounded-full text-xs mb-2">
                  {goal.category}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold font-poppins">
                  {goal.current}
                  <span className="text-sm text-muted-foreground">/{goal.target}</span>
                </p>
                <p className="text-xs text-muted-foreground">{goal.unit}</p>
              </div>
            </div>

            <Progress value={goal.progress} className="h-2" />

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{goal.deadline}</span>
              </div>
              <div className="flex items-center gap-1">
                {goal.isOnTrack ? (
                  <Badge className="rounded-full bg-success">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    On Track
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="rounded-full">
                    Needs Attention
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
