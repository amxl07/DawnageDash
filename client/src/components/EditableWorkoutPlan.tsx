import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Edit2, Save, X, Plus, Trash2, Loader2, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest?: string;
}

interface DayWorkout {
  id: string;
  day: string;
  focus: string;
  exercises: Exercise[];
}

interface EditableWorkoutPlanProps {
  initialPlan: DayWorkout[];
  level?: string;
  onSave?: (plan: DayWorkout[]) => void;
}

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function EditableWorkoutPlan({ initialPlan, level = 'Beginner', onSave }: EditableWorkoutPlanProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [workoutPlan, setWorkoutPlan] = useState<DayWorkout[]>([]);
  const [editingDay, setEditingDay] = useState<string | null>(null);

  useEffect(() => {
    const sorted = [...initialPlan].sort((a, b) => {
      return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
    });
    setWorkoutPlan(sorted);
  }, [initialPlan]);

  const handleSave = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { error: deleteError } = await supabase
        .from('workout_plans')
        .delete()
        .eq('user_id', user.id)
        .eq('level', level);

      if (deleteError) throw deleteError;

      const rows = workoutPlan.map(day => ({
        user_id: user.id,
        day_of_week: day.day,
        focus: day.focus,
        level: level,
        exercises: JSON.stringify(day.exercises),
      }));

      const { error: insertError } = await supabase
        .from('workout_plans')
        .insert(rows);

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Workout plan saved successfully!",
      });

      onSave?.(workoutPlan);
      setIsEditing(false);
      setEditingDay(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save workout plan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    const sorted = [...initialPlan].sort((a, b) => {
      return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
    });
    setWorkoutPlan(sorted);
    setIsEditing(false);
    setEditingDay(null);
  };

  const updateExercise = (dayId: string, exerciseId: string, field: keyof Exercise, value: string | number) => {
    setWorkoutPlan(plan =>
      plan.map(day =>
        day.id === dayId
          ? {
            ...day,
            exercises: day.exercises.map(ex =>
              ex.id === exerciseId ? { ...ex, [field]: value } : ex
            ),
          }
          : day
      )
    );
  };

  const addExercise = (dayId: string) => {
    setWorkoutPlan(plan =>
      plan.map(day =>
        day.id === dayId
          ? {
            ...day,
            exercises: [
              ...day.exercises,
              { id: `ex-${Date.now()}`, name: 'New Exercise', sets: 3, reps: '10-12', rest: '60s' },
            ],
          }
          : day
      )
    );
  };

  const removeExercise = (dayId: string, exerciseId: string) => {
    setWorkoutPlan(plan =>
      plan.map(day =>
        day.id === dayId
          ? {
            ...day,
            exercises: day.exercises.filter(ex => ex.id !== exerciseId),
          }
          : day
      )
    );
  };

  const updateDayInfo = (dayId: string, field: 'day' | 'focus', value: string) => {
    setWorkoutPlan(plan =>
      plan.map(day => (day.id === dayId ? { ...day, [field]: value } : day))
    );
  };

  return (
    <Card className="p-6" data-testid="card-workout-plan">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold mb-1">Weekly Schedule</h3>
          <p className="text-sm text-muted-foreground">Your training plan for the week</p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                size="sm"
                data-testid="button-cancel-edit"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} size="sm" data-testid="button-save-workout" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              size="sm"
              data-testid="button-edit-workout"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {isEditing && (
        <>
          <div className="mb-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
            Click on any day to expand and edit exercises
          </div>
          <Separator className="mb-6" />
        </>
      )}

      <Accordion type="single" collapsible className="space-y-3">
        {workoutPlan.map((day, index) => (
          <AccordionItem
            key={day.id}
            value={day.id}
            className="border rounded-lg"
            data-testid={`accordion-day-${day.day.toLowerCase()}`}
          >
            <AccordionTrigger className="hover:no-underline px-4 py-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-sm font-semibold">
                  {index + 1}
                </div>
                <div className="text-left flex-1">
                  {isEditing && editingDay === day.id ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={day.day}
                        onChange={(e) => updateDayInfo(day.id, 'day', e.target.value)}
                        className="max-w-[120px] h-9 text-sm"
                        data-testid={`input-day-name-${day.id}`}
                      />
                      <Input
                        value={day.focus}
                        onChange={(e) => updateDayInfo(day.id, 'focus', e.target.value)}
                        className="h-9 text-sm"
                        placeholder="Focus area..."
                        data-testid={`input-day-focus-${day.id}`}
                      />
                    </div>
                  ) : (
                    <>
                      <p className="font-semibold text-base">{day.day}</p>
                      <p className="text-sm text-muted-foreground">{day.focus || 'Rest day'}</p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingDay(editingDay === day.id ? null : day.id);
                      }}
                      className="h-8 text-xs"
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {day.exercises.length}
                  </Badge>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="px-4 pb-3 pt-2 space-y-2">
                {day.exercises.length === 0 ? (
                  <p className="text-center py-6 text-sm text-muted-foreground">
                    No exercises added
                  </p>
                ) : (
                  day.exercises.map((exercise, exIndex) => (
                    <div
                      key={exercise.id}
                      className="flex items-start gap-3 p-3 border rounded-lg bg-background"
                    >
                      <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs font-medium mt-0.5">
                        {exIndex + 1}
                      </div>
                      <div className="flex-1 space-y-2">
                        {isEditing ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <Input
                              value={exercise.name}
                              onChange={(e) => updateExercise(day.id, exercise.id, 'name', e.target.value)}
                              className="h-9 text-sm md:col-span-2"
                              placeholder="Exercise name"
                              data-testid={`input-exercise-name-${exercise.id}`}
                            />
                            <Input
                              type="number"
                              value={exercise.sets}
                              onChange={(e) => updateExercise(day.id, exercise.id, 'sets', parseInt(e.target.value))}
                              className="h-9 text-sm"
                              placeholder="Sets"
                              data-testid={`input-exercise-sets-${exercise.id}`}
                            />
                            <Input
                              value={exercise.reps}
                              onChange={(e) => updateExercise(day.id, exercise.id, 'reps', e.target.value)}
                              className="h-9 text-sm"
                              placeholder="Reps"
                              data-testid={`input-exercise-reps-${exercise.id}`}
                            />
                            <Input
                              value={exercise.rest || ''}
                              onChange={(e) => updateExercise(day.id, exercise.id, 'rest', e.target.value)}
                              className="h-9 text-sm md:col-span-2"
                              placeholder="Rest (e.g., 60s)"
                              data-testid={`input-exercise-rest-${exercise.id}`}
                            />
                          </div>
                        ) : (
                          <>
                            <p className="font-medium text-sm">{exercise.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                          </>
                        )}
                      </div>
                      {isEditing && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeExercise(day.id, exercise.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          data-testid={`button-remove-exercise-${exercise.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))
                )}

                {isEditing && (
                  <Button
                    variant="outline"
                    onClick={() => addExercise(day.id)}
                    size="sm"
                    className="w-full mt-2"
                    data-testid={`button-add-exercise-${day.id}`}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Exercise
                  </Button>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Card>
  );
}
