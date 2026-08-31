import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
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
}: RatingOptionProps) {
  const { colors } = useTheme();
  const motion = useMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!active) return;

    scale.set(motion.enabled ? motion.pressScale : 1);
    scale.set(
      withTiming(1, {
        duration: motion.duration.micro,
        easing: Easing.bezier(...motion.easing.standard),
      }),
    );
  }, [active, motion.duration.micro, motion.easing.standard, motion.enabled, motion.pressScale, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      accessible={accessible}
      accessibilityElementsHidden={!accessible}
      importantForAccessibility={accessible ? 'yes' : 'no'}
      accessibilityRole={accessible ? 'radio' : undefined}
      accessibilityLabel={accessible ? `${label}, ${option}` : undefined}
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
          borderWidth: active ? 2 : 1,
          borderColor: active ? colors.primary : colors.borderStrong,
          backgroundColor: active ? colors.primaryFill : 'transparent',
        },
        animatedStyle,
      ]}
    >
      <Text style={[type.body, tabularNums]} tone={active ? 'onPrimary' : 'default'}>
        {option}
      </Text>
      <View
        testID={testID ? `${testID}-progress` : undefined}
        accessible={false}
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          left: 0,
          height: 2,
          backgroundColor: colors.primary,
          opacity: progressed ? 1 : 0,
        }}
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
}: Props) {
  const { isCompact, isWide } = useResponsiveLayout();
  const rows = isWide ? [values] : [values.slice(0, 5), values.slice(5, 10)];
  const exposesOptions = accessibilityMode === 'options';
  const rowGap = isCompact ? spacing.xs : spacing.sm;

  const select = (next: number) => {
    if (next === value) return;

    onChange(next);
    void Haptics.selectionAsync();
  };

  return (
    <View
      accessible={!exposesOptions}
      accessibilityRole={exposesOptions ? undefined : 'adjustable'}
      accessibilityLabel={exposesOptions ? undefined : label}
      accessibilityValue={
        exposesOptions ? undefined : { min: 1, max: 10, now: value ?? 1 }
      }
      accessibilityActions={
        exposesOptions ? undefined : [{ name: 'increment' }, { name: 'decrement' }]
      }
      onAccessibilityAction={
        exposesOptions
          ? undefined
          : ({ nativeEvent }) => {
              const current = value ?? 1;
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
            />
          ))}
        </View>
      ))}
    </View>
  );
}
