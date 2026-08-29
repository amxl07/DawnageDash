import * as Haptics from 'expo-haptics';
import { Check, Trash2 } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui';
import type { WorkoutSet } from '@/features/workout/workoutReducer';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import {
  HIT_SLOP_MIN,
  iconSize,
  radius,
  spacing,
  tabularNums,
  type,
  useMotion,
  useTheme,
} from '@/theme';

type EditableSetField = 'weight' | 'reps' | 'rpe';

type Props = {
  index: number;
  set: WorkoutSet;
  previous?: Pick<WorkoutSet, 'weight' | 'reps' | 'rpe'>;
  targetReps?: string;
  isCurrent: boolean;
  canRemove: boolean;
  onUpdate: (field: EditableSetField, value: string) => void;
  onToggle: () => void;
  onRemove: () => void;
};

type FieldProps = {
  label: string;
  shortLabel: string;
  value: string;
  keyboardType: 'decimal-pad' | 'number-pad';
  onChangeText: (value: string) => void;
  compact: boolean;
};

function SetField({
  label,
  shortLabel,
  value,
  keyboardType,
  onChangeText,
  compact,
}: FieldProps) {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, minWidth: compact ? undefined : 72, gap: spacing.xs }}>
      <Text variant="label" tone="muted">
        {shortLabel}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        returnKeyType="done"
        accessibilityLabel={label}
        placeholder="—"
        placeholderTextColor={colors.mutedForeground}
        style={[
          type.body,
          tabularNums,
          {
            minHeight: HIT_SLOP_MIN,
            minWidth: HIT_SLOP_MIN,
            paddingHorizontal: spacing.sm,
            color: colors.foreground,
            backgroundColor: colors.card,
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: colors.borderStrong,
          },
        ]}
      />
    </View>
  );
}

function previousText(previous: Pick<WorkoutSet, 'weight' | 'reps' | 'rpe'>): string {
  const performance = previous.weight
    ? `${previous.weight} kg × ${previous.reps || '—'}`
    : `${previous.reps || '—'} reps`;
  return `Last: ${performance}${previous.rpe ? ` @ ${previous.rpe}` : ''}`;
}

export function SetEditor({
  index,
  set,
  previous,
  targetReps,
  isCurrent,
  canRemove,
  onUpdate,
  onToggle,
  onRemove,
}: Props) {
  const { isCompact } = useResponsiveLayout();
  const { colors } = useTheme();
  const motion = useMotion();
  const setNumber = index + 1;
  const mounted = useRef(false);
  const completionScale = useSharedValue(1);
  const completionOpacity = useSharedValue(1);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    if (!motion.enabled) {
      completionScale.set(1);
      completionOpacity.set(1);
      return;
    }

    completionScale.set(0.92);
    completionOpacity.set(0.92);
    const timing = {
      duration: motion.duration.feedback,
      easing: Easing.bezier(...motion.easing.standard),
      reduceMotion: ReduceMotion.System,
    };
    completionScale.set(withTiming(1, timing));
    completionOpacity.set(withTiming(1, timing));
  }, [completionOpacity, completionScale, motion, set.completed]);

  const completionStyle = useAnimatedStyle(() => ({
    opacity: completionOpacity.get(),
    transform: [{ scale: completionScale.get() }],
  }));

  const toggle = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  const completion = (
    <Animated.View style={completionStyle}>
      <Pressable
        onPress={toggle}
        accessibilityRole="checkbox"
        accessibilityLabel={`Mark set ${setNumber} ${set.completed ? 'incomplete' : 'complete'}`}
        accessibilityState={{ checked: set.completed }}
        style={{
          minWidth: HIT_SLOP_MIN,
          minHeight: HIT_SLOP_MIN,
          paddingHorizontal: spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.xs,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: set.completed ? colors.success : colors.borderStrong,
          backgroundColor: set.completed ? colors.elevated : colors.card,
        }}
      >
        {set.completed ? (
          <Check size={iconSize.sm} color={colors.success} strokeWidth={3} accessible={false} />
        ) : null}
        <Text variant="bodySm" tone={set.completed ? 'success' : 'muted'}>
          {set.completed ? 'Completed' : `Set ${setNumber}`}
        </Text>
      </Pressable>
    </Animated.View>
  );

  const weight = (
    <SetField
      compact={isCompact}
      label={`Set ${setNumber} weight in kilograms`}
      shortLabel="Weight (kg)"
      value={set.weight}
      keyboardType="decimal-pad"
      onChangeText={(value) => onUpdate('weight', value)}
    />
  );
  const repetitions = (
    <SetField
      compact={isCompact}
      label={`Set ${setNumber} repetitions`}
      shortLabel="Repetitions"
      value={set.reps}
      keyboardType="number-pad"
      onChangeText={(value) => onUpdate('reps', value)}
    />
  );
  const rpe = (
    <SetField
      compact={isCompact}
      label={`Set ${setNumber} RPE`}
      shortLabel="RPE"
      value={set.rpe}
      keyboardType="decimal-pad"
      onChangeText={(value) => onUpdate('rpe', value)}
    />
  );
  const remove = (
    <Pressable
      onPress={canRemove ? onRemove : undefined}
      disabled={!canRemove}
      accessibilityRole="button"
      accessibilityLabel={`Remove set ${setNumber}`}
      accessibilityState={{ disabled: !canRemove }}
      style={{
        minWidth: HIT_SLOP_MIN,
        minHeight: HIT_SLOP_MIN,
        paddingHorizontal: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        opacity: canRemove ? 1 : 0.45,
      }}
    >
      <Trash2 size={iconSize.sm} color={colors.destructive} strokeWidth={2} accessible={false} />
      {isCompact ? (
        <Text variant="bodySm" tone="primary">
          Remove set
        </Text>
      ) : null}
    </Pressable>
  );

  return (
    <View
      style={{
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: isCurrent && !set.completed ? 2 : 1,
        borderColor: isCurrent && !set.completed ? colors.primary : colors.border,
        backgroundColor: colors.elevated,
        opacity: set.completed ? 0.72 : 1,
      }}
    >
      {isCurrent && !set.completed ? (
        <Text variant="label" tone="primary">
          Current set
        </Text>
      ) : null}

      {isCompact ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>{completion}</View>
          <View testID="set-editor-fields" style={[{ flexDirection: 'column', gap: spacing.sm }]}>
            {weight}
            {repetitions}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
            {rpe}
            {remove}
          </View>
        </>
      ) : (
        <View
          testID="set-editor"
          style={[{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }]}
        >
          {completion}
          <View
            testID="set-editor-fields"
            style={[{ flex: 1, flexDirection: 'row', gap: spacing.sm }]}
          >
            {weight}
            {repetitions}
            {rpe}
          </View>
          {remove}
        </View>
      )}

      {targetReps ? (
        <Text variant="bodySm" tone="muted">
          Target: {targetReps} reps
        </Text>
      ) : null}
      {previous ? (
        <Text variant="bodySm" tone="muted">
          {previousText(previous)}
        </Text>
      ) : null}
    </View>
  );
}
