import { Check } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { CompactSetRow } from '@/components/logger/CompactSetRow';
import { CurrentSetEditor } from '@/components/logger/CurrentSetEditor';
import { PlateCalculatorSheet } from '@/components/logger/PlateCalculatorSheet';
import { ExercisePrescriptionSheet } from '@/components/plans/ExercisePrescriptionSheet';
import { Button, Text } from '@/components/ui';
import { DisclosureChevron } from '@/components/ui/DisclosureChevron';
import { MotionReveal } from '@/components/ui/MotionReveal';
import type { WorkoutSet } from '@/features/workout/workoutReducer';
import type { DraftExercise } from '@/hooks/useWorkoutDraft';
import type { PlanExercise } from '@/hooks/usePlans';
import { iconSize, radius, spacing, useTheme } from '@/theme';

type PreviousSet = { weight: string; reps: string; rpe: string; duration?: string; date?: string };
type Editable = 'reps' | 'weight' | 'rpe' | 'duration';
type Props = {
  exercise: DraftExercise;
  prescription?: PlanExercise;
  targetReps?: string;
  targetDuration?: string;
  previous?: PreviousSet[];
  previousDate?: string;
  onUpdateSet: (setId: string, field: Editable, value: string) => void;
  onToggleSet: (setId: string) => void;
  onAddSet: () => void;
  onRemoveSet: (setIndex: number) => void;
  onRestoreSet?: (set: WorkoutSet, index: number) => void;
  onSubstitute?: (exercise: PlanExercise) => void;
  onContinue?: () => void;
  continueLabel?: string;
};

export function ExerciseSlide({ exercise, prescription, targetReps, targetDuration, previous, previousDate, onUpdateSet, onToggleSet, onAddSet, onRemoveSet, onRestoreSet, onSubstitute, onContinue, continueLabel = 'Continue' }: Props) {
  const { colors } = useTheme();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [setsOpen, setSetsOpen] = useState(false);
  const [plateSetId, setPlateSetId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [removed, setRemoved] = useState<{ set: WorkoutSet; index: number } | null>(null);
  const [lastCompleted, setLastCompleted] = useState<{ id: string; label: string } | null>(null);
  const completionLock = useRef(new Set<string>());
  useEffect(() => { setActiveId(null); setRemoved(null); setPlateSetId(null); setSetsOpen(false); setLastCompleted(null); completionLock.current.clear(); }, [exercise.id, exercise.name]);
  useEffect(() => {
    for (const id of completionLock.current) {
      const set = exercise.sets.find((entry) => entry.id === id);
      if (!set || !set.completed) completionLock.current.delete(id);
    }
    if (lastCompleted && !exercise.sets.some((set) => set.id === lastCompleted.id && set.completed)) setLastCompleted(null);
  }, [exercise.sets, lastCompleted]);
  const allComplete = exercise.sets.length > 0 && exercise.sets.every((set) => set.completed);
  const selected = exercise.sets.find((set) => set.id === activeId);
  const active = selected ?? (!allComplete ? exercise.sets.find((set) => !set.completed) ?? exercise.sets[0] : undefined);
  const activeIndex = active ? exercise.sets.indexOf(active) : -1;
  const plateIndex = exercise.sets.findIndex((set) => set.id === plateSetId);
  const completed = exercise.sets.filter((set) => set.completed).length;

  return <>
    <View style={{ gap: spacing.base }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Text variant="h1" accessibilityRole="header" style={{ letterSpacing: -0.5 }}>{exercise.name}</Text>
          <Text variant="bodySm" tone="muted">{completed} of {exercise.sets.length} sets complete</Text>
        </View>
        {prescription ? <Pressable onPress={() => setDetailsOpen(true)} accessibilityRole="button" accessibilityLabel={'Show details for ' + exercise.name} style={({ pressed }) => ({ minWidth: 48, minHeight: 48, justifyContent: 'center', borderRadius: radius.sm, backgroundColor: pressed ? colors.primarySoft : 'transparent' })}>
          <Text variant="bodySm" tone="primary">Details</Text>
        </Pressable> : null}
      </View>

      {allComplete && !active ? <View testID="exercise-complete" accessibilityLiveRegion="polite" style={{ gap: spacing.sm }}>
        <Text variant="h2">Exercise complete</Text>
        <Text variant="bodySm" tone="muted">All sets are complete. You can continue or open Sets to edit an entry.</Text>
        {onContinue ? <Button testID="workout-continue" label={continueLabel} onPress={onContinue} /> : null}
      </View> : null}

      <MotionReveal revision={active?.id ?? 'exercise-complete'} testID="current-set-handoff">
      {active ? <CurrentSetEditor exercise={exercise} setId={active.id} targetReps={targetReps} targetDuration={targetDuration}
        previous={previous?.[activeIndex]} previousDate={previous?.[activeIndex]?.date ?? previousDate}
        onChange={(setId, patch) => { for (const [field, value] of Object.entries(patch)) if (['reps', 'weight', 'rpe', 'duration'].includes(field) && typeof value === 'string') onUpdateSet(setId, field as Editable, value); }}
        onComplete={(setId) => {
          const capturedIndex = exercise.sets.findIndex((entry) => entry.id === setId);
          const captured = exercise.sets[capturedIndex];
          if (!captured) return;
          if (captured.completed) {
            onToggleSet(setId);
            setLastCompleted(null);
            return;
          }
          if (completionLock.current.has(setId)) return;
          completionLock.current.add(setId);
          const completedLabel = (captured.kind === 'warmup' ? 'Warm-up ' : 'Set ') + (capturedIndex + 1);
          setLastCompleted({ id: setId, label: completedLabel });
          onToggleSet(setId);
          if (!captured.completed) {
            const next = [...exercise.sets.slice(capturedIndex + 1), ...exercise.sets.slice(0, capturedIndex)].find((entry) => !entry.completed && entry.id !== setId);
            setActiveId(next?.id ?? null);
          }
        }}
        onPlateCalculator={exercise.tracking === 'weight-reps' ? () => setPlateSetId(active.id) : undefined}
        onRemove={onRestoreSet && exercise.sets.length > 1 ? () => { setRemoved({ set: { ...active }, index: activeIndex }); onRemoveSet(activeIndex); } : undefined}
      /> : null}
      </MotionReveal>
      <MotionReveal revision={lastCompleted?.id ?? 'none'} testID="completed-set-handoff">
        {lastCompleted ? <View accessibilityLiveRegion="polite" style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Check size={iconSize.sm} color={colors.success} strokeWidth={2.3} accessible={false} />
          <Text variant="bodySm" style={{ flex: 1 }}>{lastCompleted.label} complete</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Undo completed ${lastCompleted.label.toLowerCase()}`}
            onPress={() => {
              const captured = exercise.sets.find((set) => set.id === lastCompleted.id);
              if (captured?.completed) onToggleSet(lastCompleted.id);
              completionLock.current.delete(lastCompleted.id);
              setActiveId(lastCompleted.id);
              setLastCompleted(null);
            }}
            style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: radius.sm, backgroundColor: pressed ? colors.primarySoft : 'transparent' })}
          ><Text variant="bodySm" tone="primary">Undo</Text></Pressable>
        </View> : null}
      </MotionReveal>
      {allComplete && active ? <Button label="Back to exercise summary" variant="ghost" onPress={() => setActiveId(null)} /> : null}

      {exercise.sets.length > 0 ? <Pressable testID="workout-sets-toggle" accessibilityRole="button" accessibilityLabel={`Sets (${exercise.sets.length})`} accessibilityState={{ expanded: setsOpen }} onPress={() => setSetsOpen((open) => !open)}
        style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, borderRadius: radius.sm, backgroundColor: pressed ? colors.pressed : 'transparent' })}>
        <Text variant="body" style={{ flex: 1 }}>Sets ({exercise.sets.length})</Text>
        <Text variant="bodySm" tone="muted">{setsOpen ? 'Hide' : 'Manage'}</Text><DisclosureChevron expanded={setsOpen} />
      </Pressable> : null}
      {setsOpen ? <View style={{ gap: spacing.xs }}>
        {exercise.sets.map((set, index) => set.id === active?.id ? null : <CompactSetRow key={set.id} set={set} index={index} tracking={exercise.tracking} onEdit={() => { setActiveId(set.id); setSetsOpen(false); }} onToggle={() => onToggleSet(set.id)} />)}
        <Button label="Add a set" variant="secondary" onPress={() => { setRemoved(null); onAddSet(); }} />
      </View> : null}

      {removed && onRestoreSet ? <View style={{ paddingVertical: spacing.sm, gap: spacing.xs }}>
        <Text variant="bodySm" tone="muted">Set removed from this session.</Text>
        <Button label="Undo removed set" variant="ghost" onPress={() => { onRestoreSet(removed.set, removed.index); setActiveId(removed.set.id); setRemoved(null); }} />
      </View> : null}
      {exercise.sets.length === 0 ? <View style={{ gap: spacing.sm }}><Text variant="bodySm" tone="muted">Add a set to start this exercise.</Text><Button label="Add a set" variant="secondary" onPress={() => { setRemoved(null); onAddSet(); }} /></View> : null}
      <View style={{ height: 1, backgroundColor: colors.border, marginTop: spacing.sm }} />
    </View>

    {detailsOpen && prescription ? <ExercisePrescriptionSheet visible exercise={prescription} onClose={() => setDetailsOpen(false)} onSubstitute={onSubstitute} /> : null}
    {plateIndex >= 0 ? <PlateCalculatorSheet visible initialTargetKg={exercise.sets[plateIndex].weight} onClose={() => setPlateSetId(null)} onUse={(weight) => onUpdateSet(exercise.sets[plateIndex].id, 'weight', weight)} /> : null}
  </>;
}
