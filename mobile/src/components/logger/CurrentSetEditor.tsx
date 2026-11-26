import { HIT_SLOP_MIN } from '@/theme/tokens';
import { format } from 'date-fns';
import { isDateKeyStrict, parseLocalDate } from '@/lib/dates';
import * as Haptics from 'expo-haptics';
import { Copy, Minus, Plus, RotateCcw } from 'lucide-react-native';
import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button, Input, Text } from '@/components/ui';
import { DisclosureChevron } from '@/components/ui/DisclosureChevron';
import { applySetSuggestion, canCompleteSet, stepNumericValue, type SetSuggestion, type SetSuggestionValues } from '@/features/workout/workoutSuggestions';
import type { WorkoutExercise, WorkoutSet } from '@/features/workout/workoutReducer';
import { radius, spacing, tabularNums, type, useMotion, useTheme } from '@/theme';

type Editable = Pick<WorkoutSet, 'weight' | 'reps' | 'duration' | 'rpe'>;
export type CurrentSetEditorProps = {
  exercise: WorkoutExercise;
  setId: string;
  onChange: (setId: string, patch: Partial<WorkoutSet>) => void;
  onComplete: (setId: string, suggestion: SetSuggestionValues) => boolean;
  targetReps?: string;
  targetDuration?: string;
  previous?: Partial<Editable>;
  previousDate?: string;
  suggestion?: SetSuggestion;
  onSuppressSuggestion?: (field: 'weight' | 'reps' | 'duration') => void;
  onPlateCalculator?: () => void;
  onRemove?: () => void;
};

export const CurrentSetEditor = memo(function CurrentSetEditor({ exercise, setId, onChange, onComplete, targetReps, targetDuration, previous, previousDate, suggestion, onSuppressSuggestion, onPlateCalculator, onRemove }: CurrentSetEditorProps) {
  const { colors } = useTheme();
  const motion = useMotion();
  const { width, fontScale } = useWindowDimensions();
  const [details, setDetails] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const undo = useRef<{ before: Partial<Editable>; copied: Partial<Editable> } | null>(null);
  const completionLock = useRef(false);
  const set = exercise.sets.find((entry) => entry.id === setId);
  useEffect(() => { setDetails(false); setCanUndo(false); setCompletionError(null); undo.current = null; completionLock.current = false; }, [setId]);
  useEffect(() => { if (!set?.completed) completionLock.current = false; }, [set?.completed]);
  useEffect(() => {
    if (undo.current && set && Object.entries(undo.current.copied).some(([field, value]) => set[field as keyof Editable] !== value)) {
      undo.current = null; setCanUndo(false);
    }
  }, [set]);
  if (!set) return null;
  const number = exercise.sets.indexOf(set) + 1;
  const label = (set.kind === 'warmup' ? 'Warm-up ' : 'Set ') + number;
  const fields: (keyof Editable)[] = exercise.tracking === 'duration' ? ['duration'] : ['weight', 'reps'];
  const suggestedValues: Partial<Editable> = suggestion?.values ?? previous ?? {};
  const copyable = fields.some((field) => !set[field].trim() && suggestedValues[field]?.trim());
  const copy = () => {
    const patch: Partial<Editable> = {};
    const before: Partial<Editable> = {};
    for (const field of fields) {
      if (!set[field].trim() && suggestedValues[field]?.trim()) { before[field] = set[field]; patch[field] = suggestedValues[field]; }
    }
    if (!Object.keys(patch).length) return;
    undo.current = { before, copied: patch };
    onChange(set.id, patch);
    setCanUndo(true);
    void Haptics.selectionAsync();
  };
  const previousText = Object.keys(suggestedValues).length ? (exercise.tracking === 'duration'
    ? suggestedValues.duration ? suggestedValues.duration + ' sec' : ''
    : (suggestedValues.weight ? suggestedValues.weight + ' kg × ' : '') + (suggestedValues.reps ? suggestedValues.reps + ' reps' : '')) : '';
  const sourceDate = suggestion?.date ?? previousDate;
  const readableDate = sourceDate && isDateKeyStrict(sourceDate) ? format(parseLocalDate(sourceDate), 'd MMM yyyy') : sourceDate;
  const suggestionPrefix = suggestion?.source === 'prescription' ? 'Target' : readableDate ? `Last time · ${readableDate}` : 'Last time';
  const copyAction = suggestion?.source === 'prescription'
    ? { label: 'Use target', accessibilityLabel: `Use target values for ${label.toLowerCase()}` }
    : suggestion
      ? { label: 'Use suggestion', accessibilityLabel: `Use suggested values for ${label.toLowerCase()}` }
      : { label: 'Use previous', accessibilityLabel: `Copy previous values into empty fields of ${label.toLowerCase()}` };
  const target = exercise.tracking === 'duration' ? targetDuration : targetReps ? `${targetReps} reps` : undefined;
  const showSuggestionSummary = Boolean(previousText && suggestion?.source !== 'prescription');
  const hasSuggestedWeight = !set.weight.trim() && Boolean(suggestedValues.weight?.trim());
  const bodyweightAction = hasSuggestedWeight && onSuppressSuggestion ? <Pressable
    accessibilityRole="button"
    accessibilityLabel={`Keep ${label.toLowerCase()} weight blank for bodyweight`}
    onPress={() => onSuppressSuggestion('weight')}
    style={({ pressed }) => [styles.link, { alignSelf: 'flex-start', backgroundColor: pressed ? colors.primarySoft : 'transparent' }]}
  ><Text variant="bodySm" tone="primary">Use bodyweight</Text></Pressable> : undefined;

  return <View testID="current-set-editor" style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderStrong }]}>
    <View style={styles.heading}>
      <Text variant="label" tone="muted">{label}</Text>
      <Text variant="bodySm" tone="muted">{number} of {exercise.sets.length}</Text>
    </View>
    {target ? <View testID="set-target" style={[styles.target, { backgroundColor: colors.elevated }]}>
      <Text variant="overline" tone="muted">Target</Text>
      <Text variant="label">{target}</Text>
    </View> : null}
    <View testID="set-actual" style={{ gap: spacing.sm }}>
      {previousText || canUndo ? <View style={{ gap: spacing.xs, flexDirection: showSuggestionSummary ? 'row' : 'column', alignItems: showSuggestionSummary ? 'center' : 'stretch' }}>
        {showSuggestionSummary ? <Text variant="caption" tone="muted" style={{ flex: 1 }}>{suggestionPrefix}: {previousText}</Text> : null}
        {copyable || canUndo ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {copyable ? <Pressable onPress={copy} accessibilityRole="button" accessibilityLabel={copyAction.accessibilityLabel} style={({ pressed }) => [styles.link, { backgroundColor: pressed ? colors.primarySoft : 'transparent' }]}>
            <Copy size={15} color={colors.primary} accessible={false} /><Text variant="bodySm" tone="primary">{copyAction.label}</Text>
          </Pressable> : null}
          {canUndo ? <Pressable onPress={() => { if (undo.current) onChange(set.id, undo.current.before); undo.current = null; setCanUndo(false); }} accessibilityRole="button" accessibilityLabel="Undo copied set values" style={({ pressed }) => [styles.link, { backgroundColor: pressed ? colors.primarySoft : 'transparent' }]}>
            <RotateCcw size={15} color={colors.primary} accessible={false} /><Text variant="bodySm" tone="primary">Undo copy</Text>
          </Pressable> : null}
        </View> : null}
      </View> : null}
      <View style={{ flexDirection: width < 360 || fontScale > 1.3 ? 'column' : 'row', gap: spacing.base }}>
        {exercise.tracking === 'duration' ? <SetNumber label={label + ' duration in seconds'} title="Duration" unit="seconds" value={set.duration} suggestion={suggestedValues.duration} step={5} precision={0} onChange={(duration) => { setCompletionError(null); onChange(set.id, { duration }); }} /> : <>
          <SetNumber testID="current-weight-entry" label={label + ' weight in kilograms'} title="Weight" unit="kg" value={set.weight} suggestion={suggestedValues.weight} step={2.5} precision={1} onChange={(weight) => { setCompletionError(null); onChange(set.id, { weight }); }} decimal hint={hasSuggestedWeight ? undefined : 'Leave blank for bodyweight.'} footer={bodyweightAction} />
          <SetNumber label={label + ' repetitions'} title="Repetitions" unit="reps" value={set.reps} suggestion={suggestedValues.reps} step={1} precision={0} onChange={(reps) => { setCompletionError(null); onChange(set.id, { reps }); }} />
        </>}
      </View>
    </View>
    {completionError ? <Text variant="bodySm" tone="destructive" accessibilityLiveRegion="polite">{completionError}</Text> : null}
    <Button label={set.completed ? 'Mark set incomplete' : 'Complete set'} variant={set.completed ? 'secondary' : 'primary'} testID="complete-current-set" onPress={() => {
      if (!set.completed && completionLock.current) return;
      if (!set.completed) {
        const candidate = applySetSuggestion(set, suggestion?.values);
        if (!canCompleteSet(exercise.tracking, candidate)) {
          if (exercise.tracking === 'duration') setCompletionError('Enter a valid duration before completing this set.');
          else if (!candidate.reps.trim()) setCompletionError('Enter repetitions before completing this set.');
          else if (!Number.isInteger(Number(candidate.reps.trim())) || Number(candidate.reps.trim()) <= 0) setCompletionError('Enter whole-number repetitions before completing this set.');
          else setCompletionError('Enter a valid weight or leave it blank for bodyweight.');
          return;
        }
        completionLock.current = true;
      }
      setCompletionError(null);
      const accepted = onComplete(set.id, suggestion?.values ?? {});
      if (!accepted) completionLock.current = false;
    }} />
    <Pressable onPress={() => setDetails((value) => !value)} accessibilityRole="button" accessibilityLabel="Effort and set options" accessibilityState={{ expanded: details }} style={({ pressed }) => [styles.heading, { minHeight: HIT_SLOP_MIN, borderRadius: radius.sm, backgroundColor: pressed ? colors.pressed : 'transparent' }]}>
      <Text variant="bodySm" tone="muted">{set.rpe ? 'RPE ' + set.rpe + ' · Options' : 'Effort & options'}</Text><DisclosureChevron expanded={details} color={colors.mutedForeground} />
    </Pressable>
    {details ? <Animated.View entering={motion.enabled ? FadeIn.duration(motion.duration.feedback) : undefined} style={{ gap: spacing.md }}>
      <Input label={label + ' RPE (optional)'} value={set.rpe} onChangeText={(rpe) => onChange(set.id, { rpe })} keyboardType="decimal-pad" placeholder="Your reported effort" />
      {onPlateCalculator ? <Button label="Plate calculator" variant="secondary" onPress={onPlateCalculator} /> : null}
      {onRemove ? <Button label={'Remove ' + label.toLowerCase()} variant="destructive" onPress={onRemove} /> : null}
    </Animated.View> : null}
  </View>;
});

function SetNumber({ title, label, unit, value, suggestion, step, precision, onChange, decimal, hint, footer, testID }: { title: string; label: string; unit: string; value: string; suggestion?: string; step: number; precision: number; onChange: (value: string) => void; decimal?: boolean; hint?: string; footer?: ReactNode; testID?: string }) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return <View testID={testID} style={{ flex: 1, gap: spacing.sm, minWidth: 0 }}>
    <Text variant="bodySm" tone="muted">{title}</Text>
    <View testID={`${label}-field`} style={[styles.number, { backgroundColor: colors.elevated, borderColor: focused ? colors.focusRing : colors.borderStrong }]}>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} keyboardType={decimal ? 'decimal-pad' : 'number-pad'} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} selectTextOnFocus
        placeholder={suggestion ?? '—'} placeholderTextColor={colors.mutedForeground} style={[type.metric, tabularNums, { color: colors.foreground, minHeight: 64, minWidth: 0, textAlign: 'center', padding: 0 }]} />
      <Text variant="bodySm" tone="muted" style={{ textAlign: 'center' }}>{unit}</Text>
      <View style={styles.stepper}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${label.toLowerCase().replace(' in kilograms', '')} by ${step}${unit === 'kg' ? ' kilograms' : ''}`} onPress={() => onChange(stepNumericValue({ value, suggestion, amount: -step, minimum: 0, precision }))} style={({ pressed }) => [styles.stepperAction, { backgroundColor: pressed ? colors.pressed : 'transparent' }]}>
          <Minus size={18} color={colors.foreground} accessible={false} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Increase ${label.toLowerCase().replace(' in kilograms', '')} by ${step}${unit === 'kg' ? ' kilograms' : ''}`} onPress={() => onChange(stepNumericValue({ value, suggestion, amount: step, minimum: 0, precision }))} style={({ pressed }) => [styles.stepperAction, { backgroundColor: pressed ? colors.pressed : 'transparent' }]}>
          <Plus size={18} color={colors.foreground} accessible={false} />
        </Pressable>
      </View>
    </View>
    {hint ? <Text variant="caption" tone="muted">{hint}</Text> : null}
    {footer}
  </View>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 0, borderRadius: radius.card, padding: spacing.content, gap: spacing.md },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  target: { borderRadius: radius.input, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  number: { borderRadius: radius.input, borderWidth: 1, padding: spacing.md, gap: spacing.xs },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepperAction: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  link: { minHeight: HIT_SLOP_MIN, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.sm, paddingHorizontal: spacing.sm },
});
