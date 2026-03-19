import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Check, Play, ChevronDown, History } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreviousExerciseData } from "@/hooks/usePreviousWorkoutData";

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

interface PlanMetadata {
  targetReps?: string;
  videoLink?: string;
  notes?: string;
}

interface ExerciseSlideProps {
  exercise: ExerciseRow;
  exerciseIndex: number;
  planMeta?: PlanMetadata;
  previousData?: PreviousExerciseData;
  onUpdateSet: (exerciseIndex: number, setIndex: number, field: keyof WorkoutSet, value: string) => void;
}

export function ExerciseSlide({
  exercise,
  exerciseIndex,
  planMeta,
  previousData,
  onUpdateSet,
}: ExerciseSlideProps) {
  const prevExercise = previousData?.[exercise.name.toLowerCase().trim()];

  const isSetFilled = (set: WorkoutSet) =>
    set.weight.trim() !== "" && set.reps.trim() !== "";

  const previousSummary = prevExercise?.sets
    .filter((s) => s.weight || s.reps)
    .map((s) => `${s.weight || "?"}kg x ${s.reps || "?"}`)
    .join(", ");

  return (
    <div className="flex flex-col h-full px-2 pt-1" data-carousel-slide>
      {/* A. Exercise Header */}
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-xl font-bold flex-1">{exercise.name}</h3>
        {planMeta?.videoLink && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => window.open(planMeta.videoLink, "_blank")}
          >
            <Play className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Notes */}
      {planMeta?.notes && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
            <ChevronDown className="w-3 h-3" />
            Notes
          </CollapsibleTrigger>
          <CollapsibleContent className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-2 mb-2">
            {planMeta.notes}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* B. Previous Session Banner */}
      {previousSummary && (
        <div className="flex items-center gap-2 text-xs bg-muted/30 rounded-lg p-2 mb-3">
          <History className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground truncate">
            Last: {previousSummary}
          </span>
        </div>
      )}

      {/* C. Column Labels */}
      <div className="grid grid-cols-[40px_1fr_1fr] gap-3 items-center mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
          SET
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
          KG
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
          REPS
        </span>
      </div>

      {/* D. Set Rows */}
      <div className="flex-1 overflow-y-auto space-y-3 pt-1 pb-1">
        {exercise.sets.map((set, setIdx) => {
          const isComplete = isSetFilled(set);

          return (
            <div key={setIdx} className="space-y-1">
              <div className="grid grid-cols-[40px_1fr_1fr] gap-3 items-center">
                {/* Set Badge — auto-turns green when weight + reps filled */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                    isComplete
                      ? "bg-green-500/20 text-green-600 dark:text-green-400"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  {isComplete ? <Check className="w-4 h-4" /> : setIdx + 1}
                </div>

                {/* Weight Input */}
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={set.weight}
                  onChange={(e) =>
                    onUpdateSet(exerciseIndex, setIdx, "weight", e.target.value)
                  }
                  className="h-12 text-lg text-center font-bold bg-background"
                />

                {/* Reps Input */}
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={set.reps}
                  onChange={(e) =>
                    onUpdateSet(exerciseIndex, setIdx, "reps", e.target.value)
                  }
                  className="h-12 text-lg text-center font-bold bg-background"
                />
              </div>

              {/* Target Reps — shown below the row */}
              {planMeta?.targetReps && (
                <p className="text-[11px] text-muted-foreground text-right pr-1">
                  Target: {planMeta.targetReps}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
