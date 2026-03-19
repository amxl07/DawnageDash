import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Edit2, Save, X, Plus, Trash2, Loader2, ChevronRight, Video, StickyNote, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CardioStepsInput } from "@/components/CardioStepsInput";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  videoLink?: string;
  notes?: string;
}

interface DayWorkout {
  id: string;
  dayNumber: number;
  focus: string;
  exercises: Exercise[];
  isTemplate?: boolean;
}

type WorkoutType = 'GYM_WORKOUT' | 'HOME_WORKOUT' | 'ADVANCE_CALISTHENICS' | 'POWERBUILDING' | 'CALIS_COMPOUND_LIFTS' | 'ASSESSMENT';
type SubCategory = '0_EXPERIENCE' | '6_MONTH_EXPERIENCE' | 'JUST_BODYWEIGHT' | 'JUST_DBS' | 'JUST_RINGS' | 'DBS_RINGS' | 'PHASE_1' | 'PHASE_2' | '5_DAY_PLAN' | null;

interface EditableWorkoutPlanProps {
  initialPlan: DayWorkout[];
  level: string;
  workoutType: WorkoutType;
  subCategory: SubCategory;
  daysPerWeek: number;
  onSave?: (plan: DayWorkout[]) => void;
  isReadOnly?: boolean;
}

const renderWithLinks = (text: string) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

interface SortableExerciseItemProps {
  exercise: Exercise;
  exIndex: number;
  dayId: string;
  isEditing: boolean;
  onUpdate: (dayId: string, exerciseId: string, field: keyof Exercise, value: any) => void;
  onRemove: (dayId: string, exerciseId: string) => void;
}

function SortableExerciseItem({ exercise, exIndex, dayId, isEditing, onUpdate, onRemove }: SortableExerciseItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id, disabled: !isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-3 p-3 border rounded-lg bg-background ${
        isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''
      }`}
    >
      {isEditing && (
        <button
          className="mt-1 cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground transition-colors"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-5 h-5" />
        </button>
      )}
      <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs font-medium mt-0.5 shrink-0">
        {exIndex + 1}
      </div>
      <div className="flex-1 space-y-2">
        {isEditing ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="col-span-2 md:col-span-2">
                <Input
                  value={exercise.name}
                  onChange={(e) => onUpdate(dayId, exercise.id, 'name', e.target.value)}
                  className="h-9 text-sm"
                  placeholder="Exercise name"
                  data-testid={`input-exercise-name-${exercise.id}`}
                />
              </div>
              <Input
                type="number"
                value={exercise.sets}
                onChange={(e) => onUpdate(dayId, exercise.id, 'sets', parseInt(e.target.value))}
                className="h-9 text-sm"
                placeholder="Sets"
                data-testid={`input-exercise-sets-${exercise.id}`}
              />
              <Input
                value={exercise.reps}
                onChange={(e) => onUpdate(dayId, exercise.id, 'reps', e.target.value)}
                className="h-9 text-sm"
                placeholder="Reps"
                data-testid={`input-exercise-reps-${exercise.id}`}
              />
            </div>
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-primary shrink-0" />
              <Input
                value={exercise.videoLink || ''}
                onChange={(e) => onUpdate(dayId, exercise.id, 'videoLink', e.target.value)}
                className="h-9 text-sm flex-1"
                placeholder="Video Link (YouTube URL)"
                data-testid={`input-exercise-video-${exercise.id}`}
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <StickyNote className="w-3 h-3" />
                <span>Notes & Instructions (Optional, Paste links here)</span>
              </div>
              <Textarea
                value={exercise.notes || ''}
                onChange={(e) => onUpdate(dayId, exercise.id, 'notes', e.target.value)}
                className="min-h-[60px] text-sm resize-y"
                placeholder="Add notes, alternate workouts, or additional links..."
                data-testid={`textarea-exercise-notes-${exercise.id}`}
              />
            </div>
          </div>
        ) : (
          <>
            <p className="font-medium text-sm">{exercise.name}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{exercise.sets} sets</span>
              <span>•</span>
              <span>{exercise.reps} reps</span>
              {exercise.videoLink && (
                <>
                  <span>•</span>
                  <a
                    href={exercise.videoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Video className="w-3 h-3" />
                    Watch Video
                  </a>
                </>
              )}
            </div>
            {exercise.notes && (
              <div className="mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-md whitespace-pre-wrap">
                {renderWithLinks(exercise.notes)}
              </div>
            )}
          </>
        )}
      </div>
      {isEditing && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(dayId, exercise.id)}
          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
          data-testid={`button-remove-exercise-${exercise.id}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

export function EditableWorkoutPlan({
  initialPlan,
  level,
  workoutType,
  subCategory,
  daysPerWeek,
  onSave,
  isReadOnly = false
}: EditableWorkoutPlanProps) {
  const { user, viewedUserId, isCoachView } = useAuth();
  const targetUserId = viewedUserId || user?.id;

  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [workoutPlan, setWorkoutPlan] = useState<DayWorkout[]>([]);
  const [editingDay, setEditingDay] = useState<string | null>(null);


  useEffect(() => {
    const sorted = [...initialPlan]
      .map(day => ({
        ...day,
        exercises: Array.isArray(day.exercises)
          ? day.exercises
          : typeof day.exercises === 'string'
            ? JSON.parse(day.exercises)
            : [],
      }))
      .sort((a, b) => a.dayNumber - b.dayNumber);
    setWorkoutPlan(sorted);
  }, [initialPlan]);

  const handleSave = async () => {
    if (!targetUserId) return;
    setIsLoading(true);

    try {
      // Delete existing plans for this hierarchy path
      let deleteQuery = supabase
        .from('workout_plans')
        .delete()
        .eq('user_id', targetUserId)
        .eq('level', level)
        .eq('workout_type', workoutType)
        .eq('days_per_week', daysPerWeek);

      if (subCategory) {
        deleteQuery = deleteQuery.eq('sub_category', subCategory);
      } else {
        deleteQuery = deleteQuery.is('sub_category', null);
      }

      const { error: deleteError } = await deleteQuery;
      if (deleteError) throw deleteError;

      const rows = workoutPlan.map(day => ({
        user_id: targetUserId,
        level: level,
        workout_type: workoutType,
        sub_category: subCategory,
        days_per_week: daysPerWeek,
        day_number: day.dayNumber,
        focus: day.focus,
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
    const sorted = [...initialPlan].sort((a, b) => a.dayNumber - b.dayNumber);
    setWorkoutPlan(sorted);
    setIsEditing(false);
    setEditingDay(null);
  };

  const handleDragEnd = (event: DragEndEvent, dayId: string) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setWorkoutPlan((prevPlan) => {
      return prevPlan.map(day => {
        if (day.id !== dayId) return day;

        const oldIndex = day.exercises.findIndex(ex => ex.id === active.id);
        const newIndex = day.exercises.findIndex(ex => ex.id === over.id);

        return {
          ...day,
          exercises: arrayMove(day.exercises, oldIndex, newIndex)
        };
      });
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
              { id: `ex-${Date.now()}`, name: 'New Exercise', sets: 3, reps: '10-12', videoLink: '', notes: '' },
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

  const updateDayFocus = (dayId: string, value: string) => {
    setWorkoutPlan(plan =>
      plan.map(day => (day.id === dayId ? { ...day, focus: value } : day))
    );
  };

  return (
    <Card className="p-6" data-testid="card-workout-plan">
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold mb-1">{daysPerWeek}-Day Schedule</h3>
            <p className="text-sm text-muted-foreground">Your training plan</p>
          </div>
          <div className="flex items-center gap-2">
            {!isReadOnly && (
              isEditing ? (
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
                  <Button
                    onClick={handleSave}
                    size="sm"
                    data-testid="button-save-plan"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Plan
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  size="sm"
                  data-testid="button-edit-plan"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Plan
                </Button>
              )
            )}
          </div>
        </div>

        {/* Cardio & Steps inline section */}
        {targetUserId && (
          <div className="pt-3 border-t">
            <CardioStepsInput userId={targetUserId} isCoach={!isReadOnly} />
          </div>
        )}
      </div>

      {isEditing && (
        <>
          <div className="mb-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground flex items-center gap-2">
            <GripVertical className="w-4 h-4" />
            <span>Click on any day to expand and edit exercises. Drag exercises to reorder them.</span>
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
            data-testid={`accordion-day-${day.dayNumber}`}
          >
            <AccordionTrigger className="hover:no-underline px-4 py-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-sm font-semibold">
                  {index + 1}
                </div>
                <div className="text-left flex-1">
                  {isEditing && editingDay === day.id ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span className="text-sm font-medium text-muted-foreground">Day {day.dayNumber}</span>
                      <Input
                        value={day.focus}
                        onChange={(e) => updateDayFocus(day.id, e.target.value)}
                        className="h-9 text-sm flex-1"
                        placeholder="Focus area..."
                        data-testid={`input-day-focus-${day.id}`}
                      />
                    </div>
                  ) : (
                    <>
                      <p className="font-semibold text-base">Day {day.dayNumber}</p>
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
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleDragEnd(event, day.id)}
                  >
                    <SortableContext
                      items={day.exercises.map(ex => ex.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {day.exercises.map((exercise, exIndex) => (
                        <SortableExerciseItem
                          key={exercise.id}
                          exercise={exercise}
                          exIndex={exIndex}
                          dayId={day.id}
                          isEditing={isEditing}
                          onUpdate={updateExercise}
                          onRemove={removeExercise}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
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
