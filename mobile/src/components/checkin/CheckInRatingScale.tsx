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
  minWidth: number;
  minHeight: number;
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
  minWidth,
  minHeight,
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
    borderColor: interpolateColor(selection.get(), [0, 1], ['transparent', colors.primary]),
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
      aria-checked={accessible ? active : undefined}
      pressRetentionOffset={16}
      style={[
        {
          flex: 1,
          minWidth,
          minHeight,
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
  const { fontScale = 1 } = useResponsiveLayout();
  const [availableWidth, setAvailableWidth] = useState(0);
  const rowGap = spacing.xs;
  // Reserve room for both digits at the current text size as well as a full touch target.
  const minOptionWidth = Math.max(HIT_SLOP_MIN, Math.ceil((type.body.fontSize ?? 17) * 1.3 * Math.max(1, fontScale)) + spacing.xs * 2);
  const minOptionHeight = Math.max(HIT_SLOP_MIN, Math.ceil((type.body.lineHeight ?? 24) * Math.max(1, fontScale)) + spacing.xs * 2);
  const fittingColumns = availableWidth > 0 ? Math.floor((availableWidth + rowGap) / (minOptionWidth + rowGap)) : 5;
  // Keep the familiar two rows on phones; allow extra rows at the largest text sizes.
  const columns = fittingColumns >= 10 ? 10 : Math.max(1, Math.min(5, fittingColumns));
  const rows = Array.from({ length: Math.ceil(values.length / columns) }, (_, index) => values.slice(index * columns, (index + 1) * columns));
  const selectedValue = value !== null && Number.isInteger(value) && value >= 1 && value <= 10 ? value : null;
  const exposesOptions = accessibilityMode === 'options';
  const [selectionRevision, setSelectionRevision] = useState(0);

  const select = (next: number) => {
    if (next === value) return;

    setSelectionRevision((revision) => revision + 1);
    onChange(next);
    void Haptics.selectionAsync();
  };

  return (
    <View
      testID={optionTestIDPrefix}
      onLayout={({ nativeEvent }) => setAvailableWidth(nativeEvent.layout.width)}
      accessible={!exposesOptions}
      accessibilityRole={exposesOptions ? undefined : 'adjustable'}
      accessibilityLabel={exposesOptions ? undefined : label}
      accessibilityValue={
        exposesOptions ? undefined : selectedValue === null ? { text: 'Not selected' } : { min: 1, max: 10, now: selectedValue, text: `${selectedValue} of 10${selectedValue === 1 ? ', ' + lowLabel : selectedValue === 10 ? ', ' + highLabel : ''}` }
      }
      accessibilityHint={exposesOptions ? undefined : `1 means ${lowLabel}; 10 means ${highLabel}. Swipe up or down to choose.`}
      accessibilityActions={
        exposesOptions ? undefined : [{ name: 'increment' }, { name: 'decrement' }]
      }
      onAccessibilityAction={
        exposesOptions
          ? undefined
          : ({ nativeEvent }) => {
              const { actionName } = nativeEvent;
              if (actionName !== 'increment' && actionName !== 'decrement') return;
              if (selectedValue === null) { select(actionName === 'decrement' ? 10 : 1); return; }
              if (actionName === 'increment') select(Math.min(10, selectedValue + 1));
              if (actionName === 'decrement') select(Math.max(1, selectedValue - 1));
            }
      }
      style={{ gap: spacing.xs }}
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
              active={selectedValue === option}
              progressed={selectedValue !== null && option <= selectedValue}
              onPress={() => select(option)}
              accessible={exposesOptions}
              label={label}
              testID={optionTestIDPrefix ? `${optionTestIDPrefix}-${option}` : undefined}
              selectionRevision={selectionRevision}
              lowLabel={lowLabel}
              highLabel={highLabel}
              minWidth={minOptionWidth}
              minHeight={minOptionHeight}
            />
          ))}
        </View>
      ))}
      <View accessible={false} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: spacing.sm }}>
        <Text variant="bodySm" tone="muted" style={{ flexShrink: 1 }}>1 · {lowLabel}</Text>
        <Text variant="bodySm" tone="muted" style={{ flexShrink: 1 }}>10 · {highLabel}</Text>
      </View>
    </View>
  );
}
