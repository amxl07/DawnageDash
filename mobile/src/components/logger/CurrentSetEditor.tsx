import * as Haptics from 'expo-haptics';
import { Copy, RotateCcw } from 'lucide-react-native';
import { memo, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button, Input, Text } from '@/components/ui';
import { DisclosureChevron } from '@/components/ui/DisclosureChevron';
import type { WorkoutExercise, WorkoutSet } from '@/features/workout/workoutReducer';
import { radius, spacing, tabularNums, type, useMotion, useTheme } from '@/theme';

type Editable = Pick<WorkoutSet, 'weight' | 'reps' | 'duration' | 'rpe'>;
export type CurrentSetEditorProps = {
  exercise: WorkoutExercise;
  setId: string;
  onChange: (setId: string, patch: Partial<WorkoutSet>) => void;
  onComplete: (setId: string) => void;
  targetReps?: string;
  targetDuration?: string;
  previous?: Partial<Editable>;
  previousDate?: string;
  onPlateCalculator?: () => void;
  onRemove?: () => void;
};

export const CurrentSetEditor = memo(function CurrentSetEditor({ exercise, setId, onChange, onComplete, targetReps, targetDuration, previous, previousDate, onPlateCalculator, onRemove }: CurrentSetEditorProps) {
  const { colors } = useTheme();
  const motion = useMotion();
  const { width, fontScale } = useWindowDimensions();
  const [details, setDetails] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const undo = useRef<{ before: Partial<Editable>; copied: Partial<Editable> } | null>(null);
  const completionLock = useRef(false);
  const set = exercise.sets.find((entry) => entry.id === setId);
  useEffect(() => { setDetails(false); setCanUndo(false); undo.current = null; completionLock.current = false; }, [setId]);
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
  const copyable = previous && fields.some((field) => !set[field].trim() && previous[field]?.trim());
  const copy = () => {
    const patch: Partial<Editable> = {};
    const before: Partial<Editable> = {};
    for (const field of fields) {
      if (!set[field].trim() && previous?.[field]?.trim()) { before[field] = set[field]; patch[field] = previous[field]; }
    }
    if (!Object.keys(patch).length) return;
    undo.current = { before, copied: patch };
    onChange(set.id, patch);
    setCanUndo(true);
    void Haptics.selectionAsync();
  };
  const previousText = previous && (exercise.tracking === 'duration'
    ? previous.duration ? previous.duration + ' sec' : ''
    : (previous.weight ? previous.weight + ' kg × ' : '') + (previous.reps ? previous.reps + ' reps' : ''));
  const target = exercise.tracking === 'duration' ? targetDuration : targetReps ? `${targetReps} reps` : undefined;

  return <View testID="current-set-editor" style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderStrong }]}>
    <View style={styles.heading}>
      <Text variant="label" tone="primary">{label}</Text>
      <Text variant="bodySm" tone="muted">{number} of {exercise.sets.length}</Text>
    </View>
    {target ? <View testID="set-target" style={[styles.target, { backgroundColor: colors.primarySoft }]}>
      <Text variant="overline" tone="primary">Target</Text>
      <Text variant="label">{target}</Text>
    </View> : null}
    <View testID="set-actual" style={{ gap: spacing.sm }}>
      <Text variant="overline" tone="muted">Actual</Text>
      <View style={{ flexDirection: width < 360 || fontScale > 1.3 ? 'column' : 'row', gap: spacing.base }}>
        {exercise.tracking === 'duration' ? <SetNumber label={label + ' duration in seconds'} title="Duration" unit="seconds" value={set.duration} onChange={(duration) => onChange(set.id, { duration })} /> : <>
          <SetNumber testID="current-weight-entry" label={label + ' weight in kilograms'} title="Weight" unit="kg" value={set.weight} onChange={(weight) => onChange(set.id, { weight })} decimal hint="Bodyweight? Leave weight blank." />
          <SetNumber label={label + ' repetitions'} title="Repetitions" unit="reps" value={set.reps} onChange={(reps) => onChange(set.id, { reps })} />
        </>}
      </View>
    </View>
    <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>Complete set → rest → next set</Text>
    <Button label={set.completed ? 'Mark set incomplete' : 'Complete set'} variant={set.completed ? 'secondary' : 'primary'} testID="complete-current-set" onPress={() => {
      if (!set.completed && completionLock.current) return;
      if (!set.completed) completionLock.current = true;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onComplete(set.id);
    }} />
    {previousText ? <View style={{ gap: spacing.xs }}>
      <Text variant="bodySm" tone="muted">{previousDate ? previousDate + ' · ' : 'Previously recorded · '}{previousText}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {copyable ? <Pressable onPress={copy} accessibilityRole="button" accessibilityLabel={'Copy previous values into empty fields of ' + label.toLowerCase()} style={({ pressed }) => [styles.link, { backgroundColor: pressed ? colors.primarySoft : 'transparent' }]}>
          <Copy size={15} color={colors.primary} accessible={false} /><Text variant="bodySm" tone="primary">Use previous values</Text>
        </Pressable> : null}
        {canUndo ? <Pressable onPress={() => { if (undo.current) onChange(set.id, undo.current.before); undo.current = null; setCanUndo(false); }} accessibilityRole="button" accessibilityLabel="Undo copied set values" style={({ pressed }) => [styles.link, { backgroundColor: pressed ? colors.primarySoft : 'transparent' }]}>
          <RotateCcw size={15} color={colors.primary} accessible={false} /><Text variant="bodySm" tone="primary">Undo copy</Text>
        </Pressable> : null}
      </View>
    </View> : null}
    <Pressable onPress={() => setDetails((value) => !value)} accessibilityRole="button" accessibilityLabel="Effort and set options" accessibilityState={{ expanded: details }} style={({ pressed }) => [styles.heading, { borderRadius: radius.sm, backgroundColor: pressed ? colors.pressed : 'transparent' }]}>
      <Text variant="bodySm" tone="muted">{set.rpe ? 'RPE ' + set.rpe + ' · Options' : 'Effort & options'}</Text><DisclosureChevron expanded={details} color={colors.mutedForeground} />
    </Pressable>
    {details ? <Animated.View entering={motion.enabled ? FadeIn.duration(motion.duration.feedback) : undefined} style={{ gap: spacing.md }}>
      <Input label={label + ' RPE (optional)'} value={set.rpe} onChangeText={(rpe) => onChange(set.id, { rpe })} keyboardType="decimal-pad" placeholder="Your reported effort" />
      {onPlateCalculator ? <Button label="Plate calculator" variant="secondary" onPress={onPlateCalculator} /> : null}
      {onRemove ? <Button label={'Remove ' + label.toLowerCase()} variant="destructive" onPress={onRemove} /> : null}
    </Animated.View> : null}
  </View>;
});

function SetNumber({ title, label, unit, value, onChange, decimal, hint, testID }: { title: string; label: string; unit: string; value: string; onChange: (value: string) => void; decimal?: boolean; hint?: string; testID?: string }) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return <View testID={testID} style={{ flex: 1, gap: spacing.sm, minWidth: 0 }}>
    <Text variant="bodySm" tone="muted">{title}</Text>
    <View testID={`${label}-field`} style={[styles.number, { backgroundColor: colors.elevated, borderColor: focused ? colors.focusRing : colors.borderStrong }]}>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} keyboardType={decimal ? 'decimal-pad' : 'number-pad'} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} selectTextOnFocus
        placeholder="—" placeholderTextColor={colors.mutedForeground} style={[type.metric, tabularNums, { color: colors.foreground, minHeight: 64, minWidth: 0, textAlign: 'center', padding: 0 }]} />
      <Text variant="bodySm" tone="muted" style={{ textAlign: 'center' }}>{unit}</Text>
    </View>
    {hint ? <Text variant="caption" tone="muted">{hint}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.card, padding: spacing.content, gap: spacing.base },
  heading: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  target: { borderRadius: radius.input, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs },
  number: { borderRadius: radius.input, borderWidth: 1, padding: spacing.md, gap: spacing.xs },
  link: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.sm, paddingHorizontal: spacing.sm },
});
