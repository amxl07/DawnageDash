import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dumbbell, Edit2, Save, X, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  onSave?: (plan: DayWorkout[]) => void;
}

export function EditableWorkoutPlan({ initialPlan, onSave }: EditableWorkoutPlanProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [workoutPlan, setWorkoutPlan] = useState<DayWorkout[]>(initialPlan);
  const [editingDay, setEditingDay] = useState<string | null>(null);

  const handleSave = () => {
    // TODO: Remove mock functionality - save to Supabase
    console.log('Saving workout plan to database:', workoutPlan);
    onSave?.(workoutPlan);
    setIsEditing(false);
    setEditingDay(null);
  };

  const handleCancel = () => {
    setWorkoutPlan(initialPlan);
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
    <Card className="p-6 rounded-2xl" data-testid="card-workout-plan">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold mb-2">Weekly Workout Plan</h3>
          <p className="text-sm text-muted-foreground">Your personalized training schedule</p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="rounded-xl"
                data-testid="button-cancel-edit"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} className="rounded-xl" data-testid="button-save-workout">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="rounded-xl"
              data-testid="button-edit-workout"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Plan
            </Button>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="mb-4 p-4 rounded-xl bg-primary/10 border border-primary/20">
          <p className="text-sm font-medium flex items-center gap-2">
            <Edit2 className="w-4 h-4" />
            Editing Mode Active - Click on any field to modify
          </p>
        </div>
      )}

      <Accordion type="single" collapsible className="space-y-4">
        {workoutPlan.map((day) => (
          <AccordionItem
            key={day.id}
            value={day.id}
            className="border rounded-xl px-4"
            data-testid={`accordion-day-${day.day.toLowerCase()}`}
          >
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Dumbbell className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left flex-1">
                  {isEditing && editingDay === day.id ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={day.day}
                        onChange={(e) => updateDayInfo(day.id, 'day', e.target.value)}
                        className="rounded-lg max-w-[150px]"
                        data-testid={`input-day-name-${day.id}`}
                      />
                      <Input
                        value={day.focus}
                        onChange={(e) => updateDayInfo(day.id, 'focus', e.target.value)}
                        className="rounded-lg"
                        data-testid={`input-day-focus-${day.id}`}
                      />
                    </div>
                  ) : (
                    <>
                      <p className="font-semibold">{day.day}</p>
                      <p className="text-sm text-muted-foreground">{day.focus}</p>
                    </>
                  )}
                </div>
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingDay(editingDay === day.id ? null : day.id);
                    }}
                    className="rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}
                <Badge variant="outline" className="rounded-full">
                  {day.exercises.length} exercises
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-4 space-y-3">
                {day.exercises.map((exercise) => (
                  <div
                    key={exercise.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                      {isEditing ? (
                        <>
                          <Input
                            value={exercise.name}
                            onChange={(e) => updateExercise(day.id, exercise.id, 'name', e.target.value)}
                            className="rounded-lg md:col-span-1"
                            placeholder="Exercise name"
                            data-testid={`input-exercise-name-${exercise.id}`}
                          />
                          <Input
                            type="number"
                            value={exercise.sets}
                            onChange={(e) => updateExercise(day.id, exercise.id, 'sets', parseInt(e.target.value))}
                            className="rounded-lg"
                            placeholder="Sets"
                            data-testid={`input-exercise-sets-${exercise.id}`}
                          />
                          <Input
                            value={exercise.reps}
                            onChange={(e) => updateExercise(day.id, exercise.id, 'reps', e.target.value)}
                            className="rounded-lg"
                            placeholder="Reps"
                            data-testid={`input-exercise-reps-${exercise.id}`}
                          />
                          <Input
                            value={exercise.rest || ''}
                            onChange={(e) => updateExercise(day.id, exercise.id, 'rest', e.target.value)}
                            className="rounded-lg"
                            placeholder="Rest"
                            data-testid={`input-exercise-rest-${exercise.id}`}
                          />
                        </>
                      ) : (
                        <div className="md:col-span-4">
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
                      )}
                    </div>
                    {isEditing && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeExercise(day.id, exercise.id)}
                        className="rounded-lg text-destructive hover:text-destructive"
                        data-testid={`button-remove-exercise-${exercise.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                
                {isEditing && (
                  <Button
                    variant="outline"
                    onClick={() => addExercise(day.id)}
                    className="w-full rounded-lg"
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
