import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/Text';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import {
  HIT_SLOP_MIN,
  radius,
  spacing,
  tabularNums,
  type,
  useMotion,
  useTheme,
} from '@/theme';

type CommonProps = {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  lowLabel?: string;
  highLabel?: string;
};

type Props = CommonProps &
  (
    | { accessibilityMode?: 'adjustable'; optionTestIDPrefix?: string }
    | { accessibilityMode: 'options'; optionTestIDPrefix: string }
  );

type RatingOptionProps = {
  option: number;
  active: boolean;
  progressed: boolean;
  onPress: () => void;
  accessible: boolean;
  label: string;
  testID?: string;
  selectionRevision: number;
  lowLabel: string;
  highLabel: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function RatingOption({
  option,
  active,
  progressed,
  onPress,
  accessible,
  label,
  testID,
  selectionRevision,
  lowLabel,
  highLabel,
}: RatingOptionProps) {
  const { colors } = useTheme();
  const motion = useMotion();
  const scale = useSharedValue(1);
  const selection = useSharedValue(active ? 1 : 0);
  const progress = useSharedValue(progressed ? 1 : 0);
  const previousSelectionRevision = useRef(selectionRevision);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const userChangedSelection = previousSelectionRevision.current !== selectionRevision;
    previousSelectionRevision.current = selectionRevision;
    const nextSelection = active ? 1 : 0;
    const nextProgress = progressed ? 1 : 0;
    selection.set(
      motion.enabled && userChangedSelection ? withTiming(nextSelection, {
        duration: motion.duration.feedback,
        easing: Easing.bezier(...motion.easing.standard),
      }) : nextSelection,
    );
    progress.set(
      motion.enabled && userChangedSelection ? withTiming(nextProgress, {
        duration: motion.duration.feedback,
        easing: Easing.bezier(...motion.easing.standard),
      }) : nextProgress,
    );
    return () => {
      cancelAnimation(selection);
      cancelAnimation(progress);
    };
  }, [active, motion.duration.feedback, motion.easing.standard, motion.enabled, progressed, progress, selection, selectionRevision]);

  useEffect(() => {
    if (!motion.enabled) {
      cancelAnimation(scale);
      scale.set(1);
    }
    return () => cancelAnimation(scale);
  }, [motion.enabled, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
    borderColor: interpolateColor(selection.get(), [0, 1], [colors.borderStrong, colors.primary]),
    backgroundColor: interpolateColor(selection.get(), [0, 1], ['transparent', colors.primarySoft]),
  }));
  const progressStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));

  const updatePress = (nextPressed: boolean) => {
    setPressed(nextPressed);
    const next = nextPressed && motion.enabled ? motion.pressScale : 1;
    scale.set(motion.enabled ? withTiming(next, {
      duration: motion.duration.micro,
      easing: Easing.bezier(...motion.easing.standard),
    }) : next);
  };

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onPressIn={() => updatePress(true)}
      onPressOut={() => updatePress(false)}
      accessible={accessible}
      accessibilityElementsHidden={!accessible}
      importantForAccessibility={accessible ? 'yes' : 'no'}
      accessibilityRole={accessible ? 'radio' : undefined}
      accessibilityLabel={accessible ? `${label}, ${option}${option === 1 ? ', ' + lowLabel : option === 10 ? ', ' + highLabel : ''}` : undefined}
      accessibilityState={accessible ? { selected: active, checked: active } : undefined}
      pressRetentionOffset={16}
      style={[
        {
          flex: 1,
          minWidth: HIT_SLOP_MIN,
          minHeight: HIT_SLOP_MIN,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderRadius: radius.md,
          borderWidth: 1,
        },
        animatedStyle,
        pressed && { backgroundColor: colors.pressed },
      ]}
    >
      <Text style={[type.body, tabularNums]}>
        {option}
      </Text>
      <Animated.View
        testID={testID ? `${testID}-progress` : undefined}
        accessible={false}
        pointerEvents="none"
        style={[{
          position: 'absolute',
          right: 0,
          bottom: 0,
          left: 0,
          height: 2,
          backgroundColor: colors.primary,
        }, progressStyle]}
      />
    </AnimatedPressable>
  );
}

const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export function CheckInRatingScale({
  label,
  value,
  onChange,
  accessibilityMode = 'adjustable',
  optionTestIDPrefix,
  lowLabel = 'Low',
  highLabel = 'High',
}: Props) {
  const { isCompact, isWide } = useResponsiveLayout();
  const rows = isWide ? [values] : [values.slice(0, 5), values.slice(5, 10)];
  const exposesOptions = accessibilityMode === 'options';
  const rowGap = isCompact ? spacing.xs : spacing.sm;
  const [selectionRevision, setSelectionRevision] = useState(0);

  const select = (next: number) => {
    if (next === value) return;

    setSelectionRevision((revision) => revision + 1);
    onChange(next);
    void Haptics.selectionAsync();
  };

  return (
    <View
      accessible={!exposesOptions}
      accessibilityRole={exposesOptions ? undefined : 'adjustable'}
      accessibilityLabel={exposesOptions ? undefined : label}
      accessibilityValue={
        exposesOptions ? undefined : value === null ? { text: 'Not selected' } : { min: 1, max: 10, now: value, text: `${value} of 10${value === 1 ? ', ' + lowLabel : value === 10 ? ', ' + highLabel : ''}` }
      }
      accessibilityHint={exposesOptions ? undefined : `1 means ${lowLabel}; 10 means ${highLabel}. Swipe up or down to choose.`}
      accessibilityActions={
        exposesOptions ? undefined : [{ name: 'increment' }, { name: 'decrement' }]
      }
      onAccessibilityAction={
        exposesOptions
          ? undefined
          : ({ nativeEvent }) => {
              if (value === null) { select(nativeEvent.actionName === 'decrement' ? 10 : 1); return; }
              const current = value;
              if (nativeEvent.actionName === 'increment') select(Math.min(10, current + 1));
              if (nativeEvent.actionName === 'decrement') select(Math.max(1, current - 1));
            }
      }
      style={{ gap: spacing.sm }}
    >
      {rows.map((row, rowIndex) => (
        <View
          key={rowIndex}
          testID={
            optionTestIDPrefix ? `${optionTestIDPrefix}-row-${rowIndex + 1}` : undefined
          }
          style={{ flexDirection: 'row', gap: rowGap }}
        >
          {row.map((option) => (
            <RatingOption
              key={option}
              option={option}
              active={value === option}
              progressed={value !== null && option <= value}
              onPress={() => select(option)}
              accessible={exposesOptions}
              label={label}
              testID={optionTestIDPrefix ? `${optionTestIDPrefix}-${option}` : undefined}
              selectionRevision={selectionRevision}
              lowLabel={lowLabel}
              highLabel={highLabel}
            />
          ))}
        </View>
      ))}
      <View accessible={false} style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm }}>
        <Text variant="bodySm" tone="muted" style={{ flex: 1 }}>1 · {lowLabel}</Text>
        <Text variant="bodySm" tone="muted" style={{ flex: 1, textAlign: 'right' }}>10 · {highLabel}</Text>
      </View>
      <Text variant="bodySm" tone={value === null ? 'muted' : 'primary'} accessibilityLiveRegion="polite">{value === null ? 'Tap the number that feels closest' : value + ' of 10 selected'}</Text>
    </View>
  );
}
