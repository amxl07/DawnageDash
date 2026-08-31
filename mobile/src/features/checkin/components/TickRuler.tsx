import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Text } from '@/components/ui';
import { HIT_SLOP_MIN, radius, spacing, tabularNums, type, useMotion, useTheme } from '@/theme';

import { valueAfterRulerDrag, type RulerMath } from './rulerMath';

type Props = RulerMath & {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  unit: string;
  hint?: string;
  error?: string;
  testID?: string;
  children?: React.ReactNode;
};

const TICKS = Array.from({ length: 21 }, (_, index) => index - 10);

export function TickRuler({
  label,
  value,
  onChange,
  unit,
  min,
  max,
  step,
  pxPerStep,
  precision,
  hint,
  error,
  testID,
  children,
}: Props) {
  const { colors } = useTheme();
  const motion = useMotion();
  const translationX = useSharedValue(0);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');

  const display = value === null
    ? 'Tap to set'
    : value.toFixed(precision).replace(/\.0+$/, '');

  const commit = (next: number | null) => {
    if (next === value) return;
    onChange(next);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const commitDrag = (distance: number) => {
    commit(valueAfterRulerDrag(value, distance, { min, max, step, pxPerStep, precision }));
  };

  const bump = (direction: -1 | 1) => {
    if (value === null) return;
    commit(valueAfterRulerDrag(value, -direction * pxPerStep, {
      min, max, step, pxPerStep, precision,
    }));
  };

  const commitDraft = () => {
    const parsed = Number(draft.replace(',', '.'));
    commit(
      draft.trim() === '' || !Number.isFinite(parsed)
        ? null
        : Number(Math.min(max, Math.max(min, parsed)).toFixed(precision)),
    );
    setTyping(false);
  };

  const pan = Gesture.Pan()
    .enabled(value !== null && !typing)
    .activeOffsetX([-8, 8])
    .onUpdate((event) => {
      'worklet';
      translationX.set(Math.max(-120, Math.min(120, event.translationX)));
    })
    .onEnd((event) => {
      'worklet';
      const distance = event.translationX;
      translationX.set(
        motion.enabled
          ? withSpring(0, { duration: 400, dampingRatio: 0.8, velocity: event.velocityX })
          : 0,
      );
      scheduleOnRN(commitDrag, distance);
    });

  const movingTicks = useAnimatedStyle(() => ({
    transform: [{ translateX: translationX.get() }],
  }));

  return (
    <View testID={testID} style={{ gap: spacing.xs }}>
      <Text variant="label" tone="muted">{label}</Text>

      {typing ? (
        <TextInput
          autoFocus
          value={draft}
          onChangeText={setDraft}
          onBlur={commitDraft}
          onSubmitEditing={commitDraft}
          keyboardType="decimal-pad"
          returnKeyType="done"
          accessibilityLabel={`${label}, type a value`}
          style={[
            type.metric,
            tabularNums,
            {
              minHeight: HIT_SLOP_MIN + 8,
              color: colors.foreground,
              textAlign: 'center',
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: error ? colors.destructive : colors.borderStrong,
              backgroundColor: colors.elevated,
              paddingHorizontal: spacing.md,
            },
          ]}
        />
      ) : (
        <Pressable
          onPress={() => {
            setDraft(value === null ? '' : String(value));
            setTyping(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${value === null ? 'not set' : `${display} ${unit}`}. Type value`}
          style={{ minHeight: HIT_SLOP_MIN, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text variant="metric" numeric tone={value === null ? 'muted' : 'default'}>
            {display}{value === null ? '' : ` ${unit}`}
          </Text>
        </Pressable>
      )}

      <GestureDetector gesture={pan}>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityHint={value === null ? 'Type a value first, then drag to adjust.' : 'Swipe up or down to adjust, or drag the ruler.'}
          accessibilityValue={{
            min,
            max,
            now: value ?? undefined,
            text: value === null ? 'Not set' : `${display} ${unit}`,
          }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'increment') bump(1);
            if (event.nativeEvent.actionName === 'decrement') bump(-1);
          }}
          style={{
            height: 58,
            justifyContent: 'center',
            overflow: 'hidden',
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: error ? colors.destructive : colors.borderStrong,
            backgroundColor: colors.elevated,
            opacity: value === null ? 0.55 : 1,
          }}
        >
          <Animated.View
            style={[
              {
                position: 'absolute',
                left: '50%',
                flexDirection: 'row',
                alignItems: 'center',
              },
              movingTicks,
            ]}
          >
            {TICKS.map((tick) => (
              <View
                key={tick}
                style={{
                  width: pxPerStep,
                  height: tick % 5 === 0 ? 28 : 16,
                  borderLeftWidth: 1,
                  borderLeftColor: tick % 5 === 0 ? colors.mutedForeground : colors.borderStrong,
                }}
              />
            ))}
          </Animated.View>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: spacing.sm,
              bottom: spacing.sm,
              left: '50%',
              width: 2,
              borderRadius: 1,
              backgroundColor: colors.primary,
            }}
          />
        </View>
      </GestureDetector>

      {error ? (
        <Text variant="bodySm" tone="primary" accessibilityLiveRegion="polite">{error}</Text>
      ) : hint ? (
        <Text variant="bodySm" tone="muted">{hint}</Text>
      ) : (
        <Text variant="bodySm" tone="muted">Tap the value to type. Drag to fine-tune.</Text>
      )}
      {children}
    </View>
  );
}
