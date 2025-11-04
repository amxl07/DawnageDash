import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dumbbell } from "lucide-react";

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest?: string;
}

interface DayWorkout {
  day: string;
  focus: string;
  exercises: Exercise[];
}

interface WorkoutPlanProps {
  weeklyPlan: DayWorkout[];
}

export function WorkoutPlan({ weeklyPlan }: WorkoutPlanProps) {
  return (
    <Card className="p-6 rounded-2xl" data-testid="card-workout-plan">
      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-2">Weekly Workout Plan</h3>
        <p className="text-sm text-muted-foreground">Your personalized training schedule</p>
      </div>

      <Accordion type="single" collapsible className="space-y-4">
        {weeklyPlan.map((day, index) => (
          <AccordionItem key={index} value={`day-${index}`} className="border rounded-xl px-4" data-testid={`accordion-day-${day.day.toLowerCase()}`}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Dumbbell className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">{day.day}</p>
                  <p className="text-sm text-muted-foreground">{day.focus}</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-4 space-y-3">
                {day.exercises.map((exercise, exIndex) => (
                  <div key={exIndex} className="flex items-start justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex-1">
                      <p className="font-medium mb-1">{exercise.name}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{exercise.sets} sets</span>
                        <span>•</span>
                        <span>{exercise.reps} reps</span>
                        {exercise.rest && (
                          <>
                            <span>•</span>
                            <span>{exercise.rest} rest</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Card>
  );
}
