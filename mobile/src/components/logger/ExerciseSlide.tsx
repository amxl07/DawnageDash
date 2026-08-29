import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { Check, Minus, Plus, Play, Trash2 } from 'lucide-react-native';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Card, Text } from '@/components/ui';
import type { DraftExercise } from '@/hooks/useWorkoutDraft';
import { HIT_SLOP_MIN, iconSize, radius, spacing, tabularNums, type, useMotion, useTheme } from '@/theme';

type Props = {
  exercise: DraftExercise;
  targetReps?: string;
  videoLink?: string;
  notes?: string;
  /** "60kg × 8, 60 × 8, 55 × 10" from the previous session. */
  previous?: { weight: string; reps: string; rpe: string }[];
  onUpdateSet: (setIndex: number, field: 'reps' | 'weight' | 'rpe', value: string) => void;
  onAddSet: () => void;
  onRemoveSet: (setIndex: number) => void;
};

function SetStepper({
  value,
  onChange,
  step,
  label,
  keyboard,
}: {
  value: string;
  onChange: (v: string) => void;
  step: number;
  label: string;
  keyboard: 'decimal-pad' | 'number-pad';
}) {
  const { colors } = useTheme();
  const bump = (delta: number) => {
    const base = parseFloat(value);
    const next = Math.max(0, (Number.isFinite(base) ? base : 0) + delta);
    onChange(String(Math.round(next * 100) / 100));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: value || 'empty' }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') bump(step);
        if (e.nativeEvent.actionName === 'decrement') bump(-step);
      }}
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: colors.borderStrong,
        overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={() => bump(-step)}
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={{ width: 40, height: HIT_SLOP_MIN, alignItems: 'center', justifyContent: 'center' }}
      >
        <Minus size={16} color={colors.foreground} strokeWidth={2.5} />
      </Pressable>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
        returnKeyType="done"
        accessibilityElementsHidden
        importantForAccessibility="no"
        placeholder="—"
        placeholderTextColor={colors.mutedForeground}
        style={[
          type.body,
          tabularNums,
          { flex: 1, textAlign: 'center', color: colors.foreground, minWidth: 44 },
        ]}
      />
      <Pressable
        onPress={() => bump(step)}
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={{ width: 40, height: HIT_SLOP_MIN, alignItems: 'center', justifyContent: 'center' }}
      >
        <Plus size={16} color={colors.foreground} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

/** Spring layout so a completed row settles rather than snapping. */
const SetLayout = LinearTransition.springify().mass(1).damping(30).stiffness(250);

export function ExerciseSlide({
  exercise,
  targetReps,
  videoLink,
  notes,
  previous,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
}: Props) {
  const { colors } = useTheme();
  const listMotion = useMotion();

  const previousSummary = previous?.length
    ? previous
        .map((s) => (s.weight ? `${s.weight}kg × ${s.reps}` : `${s.reps} reps`))
        .join(', ')
    : null;

  return (
    <Card style={{ gap: spacing.base }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text variant="h2" style={{ flex: 1 }}>
          {exercise.name}
        </Text>
        {videoLink ? (
          <Pressable
            onPress={() => void WebBrowser.openBrowserAsync(videoLink)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Watch demo for ${exercise.name}`}
            style={{ minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' }}
          >
            <Play size={iconSize.md} color={colors.primary} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>

      {notes ? (
        <Text variant="bodySm" tone="muted">
          {notes}
        </Text>
      ) : null}

      {previousSummary ? (
        <Pressable
          onPress={() => {
            // Copy the previous session into the rows — beating last week is
            // the point of showing it, so make matching it one tap.
            previous!.forEach((p, i) => {
              if (i < exercise.sets.length) {
                onUpdateSet(i, 'weight', p.weight);
                onUpdateSet(i, 'reps', p.reps);
              }
            });
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Last session: ${previousSummary}. Tap to copy into these sets.`}
          style={{
            padding: spacing.md,
            borderRadius: radius.sm,
            backgroundColor: colors.elevated,
            minHeight: 44,
            justifyContent: 'center',
          }}
        >
          <Text variant="bodySm" tone="muted">
            Last: {previousSummary}
          </Text>
          <Text variant="bodySm" tone="primary">
            Tap to copy
          </Text>
        </Pressable>
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Text variant="label" tone="muted" style={{ width: 28 }}>
          Set
        </Text>
        <Text variant="label" tone="muted" style={{ flex: 1 }}>
          Kg
        </Text>
        <Text variant="label" tone="muted" style={{ flex: 1 }}>
          Reps
        </Text>
        <Text variant="label" tone="muted" style={{ width: 56 }}>
          RPE
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {exercise.sets.map((s, i) => {
        const complete = s.weight.trim() !== '' && s.reps.trim() !== '';
        return (
          <View key={i} style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Animated.View
                layout={listMotion.enabled ? SetLayout : undefined}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: complete ? colors.success : 'transparent',
                  borderWidth: complete ? 0 : 1,
                  borderColor: colors.borderStrong,
                }}
              >
                {complete ? (
                  <Animated.View
                    entering={listMotion.enabled ? FadeIn.duration(160) : undefined}
                    exiting={listMotion.enabled ? FadeOut.duration(120) : undefined}
                  >
                    <Check size={16} color={colors.background} strokeWidth={3} accessible={false} />
                  </Animated.View>
                ) : (
                  <Text variant="bodySm" tone="muted" numeric>
                    {i + 1}
                  </Text>
                )}
              </Animated.View>

              <SetStepper
                label={`Set ${i + 1} weight in kilograms`}
                value={s.weight}
                onChange={(v) => onUpdateSet(i, 'weight', v)}
                step={2.5}
                keyboard="decimal-pad"
              />
              <SetStepper
                label={`Set ${i + 1} reps`}
                value={s.reps}
                onChange={(v) => onUpdateSet(i, 'reps', v)}
                step={1}
                keyboard="number-pad"
              />
              <TextInput
                value={s.rpe}
                onChangeText={(v) => onUpdateSet(i, 'rpe', v)}
                keyboardType="number-pad"
                placeholder="RPE"
                placeholderTextColor={colors.mutedForeground}
                accessibilityLabel={`Set ${i + 1} RPE`}
                style={[
                  type.bodySm,
                  tabularNums,
                  {
                    width: 56,
                    height: HIT_SLOP_MIN,
                    textAlign: 'center',
                    color: colors.foreground,
                    borderRadius: radius.sm,
                    borderWidth: 1,
                    borderColor: colors.borderStrong,
                  },
                ]}
              />
              <Pressable
                onPress={() => onRemoveSet(i)}
                disabled={exercise.sets.length <= 1}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remove set ${i + 1}`}
                accessibilityState={{ disabled: exercise.sets.length <= 1 }}
                style={{
                  width: 32,
                  height: HIT_SLOP_MIN,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: exercise.sets.length <= 1 ? 0.3 : 1,
                }}
              >
                <Trash2 size={16} color={colors.mutedForeground} strokeWidth={2} />
              </Pressable>
            </View>
            {targetReps ? (
              <Text variant="bodySm" tone="muted" style={{ marginLeft: 36 }}>
                target {targetReps}
              </Text>
            ) : null}
          </View>
        );
      })}

      <Pressable
        onPress={onAddSet}
        accessibilityRole="button"
        accessibilityLabel="Add a set"
        style={{
          minHeight: HIT_SLOP_MIN,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.sm,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: colors.borderStrong,
        }}
      >
        <Text variant="bodySm" tone="primary">
          + Add set
        </Text>
      </Pressable>
    </Card>
  );
}
