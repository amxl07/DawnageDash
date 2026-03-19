import { useState, useCallback, useEffect } from "react";
import { format } from "date-fns";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dumbbell, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExerciseSlide } from "./ExerciseSlide";
import { RestTimer } from "./RestTimer";
import { usePreviousWorkoutData, type PreviousExerciseData } from "@/hooks/usePreviousWorkoutData";
import { DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";

interface WorkoutSet {
  reps: string;
  weight: string;
  rpe: string;
}

interface ExerciseRow {
  id: string;
  name: string;
  sets: WorkoutSet[];
}

interface FormState {
  date: Date;
  selectedPlanId: string;
  workoutTitle: string;
  exercises: ExerciseRow[];
  existingLogId: string | null;
  isDirty: boolean;
  isLoadingLog: boolean;
}

interface PlanMetadata {
  targetReps?: string;
  videoLink?: string;
  notes?: string;
}

interface MobileWorkoutCarouselProps {
  state: FormState;
  dispatch: React.Dispatch<any>;
  workoutPlans: any[] | undefined;
  onSave: () => void;
  canSave: boolean;
  isSaving: boolean;
  onPlanChange: (planId: string) => void;
  targetUserId: string | undefined;
}

export function parsePlanMetadata(
  plan: any,
  exerciseName: string
): PlanMetadata | undefined {
  try {
    const exercises =
      typeof plan.exercises === "string"
        ? JSON.parse(plan.exercises)
        : plan.exercises;
    if (!Array.isArray(exercises)) return undefined;

    const match = exercises.find((ex: any) => {
      const name = ex.Exercise || ex.exercise || ex.name || "";
      return name.toLowerCase().trim() === exerciseName.toLowerCase().trim();
    });

    if (!match) return undefined;

    return {
      targetReps: match.Reps || match.reps || undefined,
      videoLink: match.videoLink || match.VideoLink || undefined,
      notes: match.notes || match.Notes || undefined,
    };
  } catch {
    return undefined;
  }
}

export function MobileWorkoutCarousel({
  state,
  dispatch,
  workoutPlans,
  onSave,
  canSave,
  isSaving,
  onPlanChange,
  targetUserId,
}: MobileWorkoutCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);

  const { exercises, selectedPlanId, workoutTitle, isDirty, isLoadingLog, date } = state;

  const { data: previousData } = usePreviousWorkoutData(targetUserId, date);

  const isExerciseComplete = useCallback(
    (ex: ExerciseRow) => ex.sets.every((s) => s.weight.trim() !== "" && s.reps.trim() !== ""),
    []
  );

  // Track current slide
  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrentSlide(api.selectedScrollSnap());
    api.on("select", onSelect);
    onSelect();
    return () => { api.off("select", onSelect); };
  }, [api]);

  const handleUpdateSet = useCallback(
    (exerciseIndex: number, setIndex: number, field: keyof WorkoutSet, value: string) => {
      dispatch({
        type: "UPDATE_SET",
        payload: { exerciseIndex, setIndex, field, value },
      });
    },
    [dispatch]
  );

  // Find current plan for metadata
  const currentPlan = workoutPlans?.find((p) => p.id === selectedPlanId);

  // Completion tracking
  const completedCount = exercises.filter(isExerciseComplete).length;
  const progressPercent =
    exercises.length > 0 ? (completedCount / exercises.length) * 100 : 0;

  return (
    <div className="flex flex-col h-full">
      {/* A. Header */}
      <DrawerHeader className="pb-2 pt-2 space-y-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-primary shrink-0" />
          <DrawerTitle className="text-lg font-bold flex-1 truncate">
            {workoutTitle || "Log Workout"}
          </DrawerTitle>
          <Badge variant="outline" className="text-xs shrink-0">
            <CalendarIcon className="w-3 h-3 mr-1" />
            {format(date, "MMM d")}
          </Badge>
          {isDirty && (
            <Badge
              variant="outline"
              className="text-xs text-orange-500 border-orange-500 shrink-0"
            >
              Unsaved
            </Badge>
          )}
        </div>
        <DrawerDescription className="sr-only">
          Log your workout sets, reps, and RPE
        </DrawerDescription>

        {/* Day selector pills */}
        {workoutPlans && workoutPlans.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {workoutPlans.map((plan, index) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => onPlanChange(plan.id)}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  selectedPlanId === plan.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                Day {plan.day_number}{plan.focus ? ` - ${plan.focus}` : ''}
              </button>
            ))}
          </div>
        )}

        {/* Progress */}
        {exercises.length > 0 && (
          <div className="space-y-1">
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {completedCount} of {exercises.length} exercises
            </p>
          </div>
        )}
      </DrawerHeader>

      {/* Loading overlay */}
      {isLoadingLog && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty state */}
      {!isLoadingLog && exercises.length === 0 && (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center text-muted-foreground">
            <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Select a workout day to get started</p>
          </div>
        </div>
      )}

      {/* B. Carousel */}
      {!isLoadingLog && exercises.length > 0 && (
        <div className="flex-1 min-h-0 overflow-hidden px-2">
          <Carousel
            setApi={setApi}
            opts={{ watchDrag: true, align: "start" }}
            className="h-full"
          >
            <CarouselContent className="h-full">
              {exercises.map((exercise, idx) => (
                <CarouselItem key={exercise.id} className="h-full">
                  <ExerciseSlide
                    exercise={exercise}
                    exerciseIndex={idx}
                    planMeta={
                      currentPlan
                        ? parsePlanMetadata(currentPlan, exercise.name)
                        : undefined
                    }
                    previousData={previousData}
                    onUpdateSet={handleUpdateSet}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      )}

      {/* Rest Timer — persists across slide swipes */}
      {exercises.length > 0 && (
        <div className="shrink-0 px-4 pt-2">
          <RestTimer />
        </div>
      )}

      {/* C. Bottom Bar */}
      <div className="shrink-0 px-4 pb-4 pt-2 border-t space-y-3">
        {/* Dot indicators */}
        {exercises.length > 1 && (
          <div className="flex justify-center gap-2">
            {exercises.map((ex, idx) => {
              const isExComplete = ex.sets.every(
                (s) => s.weight.trim() !== "" && s.reps.trim() !== ""
              );
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => api?.scrollTo(idx)}
                  className={cn(
                    "rounded-full transition-all",
                    idx === currentSlide
                      ? "w-3 h-3 bg-primary"
                      : isExComplete
                        ? "w-2.5 h-2.5 bg-green-500"
                        : "w-2.5 h-2.5 bg-muted-foreground/30"
                  )}
                  aria-label={`Go to exercise ${idx + 1}`}
                />
              );
            })}
          </div>
        )}

        {/* Save button */}
        <Button
          onClick={onSave}
          disabled={!canSave}
          className="w-full h-12 text-base font-semibold"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Workout"
          )}
        </Button>
      </div>
    </div>
  );
}
