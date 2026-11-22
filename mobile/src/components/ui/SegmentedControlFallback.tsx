import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { HIT_SLOP_MIN, iconSize, radius, spacing, useMotion, useTheme } from '@/theme';
import { AppSymbol } from './AppSymbol';
import { Text } from './Text';
import type { SegmentedControlProps } from './SegmentedControl.types';

export function SegmentedControlFallback<T extends string>({
  label, segments, value, onChange, large = false, showLabel = true,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  const motion = useMotion();
  const [containerWidth, setContainerWidth] = useState(0);
  const activeIndex = segments.findIndex((segment) => segment.value === value);
  const trackInset = large ? 0 : 2;
  const segmentWidth = segments.length > 0
    ? (containerWidth - trackInset * 2 - (large ? spacing.sm * (segments.length - 1) : 0)) / segments.length
    : 0;
  const onContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth((current) => (current === width ? current : width));
  }, []);
  const thumbStyle = useAnimatedStyle(() => ({
    opacity: containerWidth > 0 && activeIndex >= 0 ? 1 : 0,
    transform: [{
      translateX: withTiming(activeIndex * (segmentWidth + spacing.sm), {
        duration: motion.duration.feedback,
        easing: Easing.bezier(...motion.easing.standard),
      }),
    }],
  }), [activeIndex, containerWidth, motion, segmentWidth]);

  return (
    <View style={{ gap: spacing.xs }}>
      {showLabel ? <Text variant="label" tone="muted">{label}</Text> : null}
      <View accessibilityRole="radiogroup" accessibilityLabel={label} onLayout={large ? undefined : onContainerLayout}
        style={{ position: 'relative', flexDirection: 'row', flexWrap: large ? 'wrap' : 'nowrap',
          gap: large ? spacing.sm : 0, padding: large ? 0 : trackInset,
          borderRadius: large ? 0 : radius.pill, backgroundColor: large ? 'transparent' : colors.elevated }}>
        {!large ? (
          <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
            style={[{ position: 'absolute', top: trackInset, left: trackInset, width: segmentWidth, bottom: trackInset,
              borderRadius: radius.pill, backgroundColor: colors.primarySoft }, thumbStyle]} />
        ) : null}
        {segments.map((segment) => {
          const active = value === segment.value;
          const Icon = segment.icon;
          return (
            <Pressable key={segment.value} onPress={() => {
              if (active) return;
              onChange(segment.value);
              void Haptics.selectionAsync();
            }} accessibilityRole="radio" accessibilityLabel={segment.label}
              accessibilityState={{ selected: active, checked: active }}
              style={({ pressed }) => ({
                flex: large ? undefined : 1, flexGrow: large ? 1 : undefined, flexBasis: large ? '46%' : 0,
                minHeight: large ? 64 : HIT_SLOP_MIN, alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
                paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: large ? radius.md : radius.pill,
                borderWidth: 0,
                backgroundColor: large
                  ? active ? (pressed ? colors.primaryPressed : colors.primaryFill) : colors.elevated
                  : pressed ? colors.pressed : 'transparent',
              })}>
              {Icon ? <Icon size={iconSize.md} color={active && large ? colors.onPrimary : active ? colors.primary : colors.mutedForeground}
                strokeWidth={2} accessible={false} /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Text variant="bodySm" tone={active && large ? 'onPrimary' : active ? 'primary' : 'default'}>{segment.label}</Text>
                {large && active ? <AppSymbol name="completion" size={16} color={colors.onPrimary} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
