import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { HIT_SLOP_MIN, iconSize, radius, spacing, useMotion, useTheme } from '@/theme';
import { Text } from './Text';

export type Segment<T extends string> = { value: T; label: string; icon?: LucideIcon };

type Props<T extends string> = {
  label: string;
  segments: Segment<T>[];
  value: T | null;
  onChange: (v: T) => void;
  /** Stack as a wrapping grid of big targets rather than a compact row. */
  large?: boolean;
  /** Keep the group label for accessibility while allowing a parent to present it visibly. */
  showLabel?: boolean;
};

/**
 * One-of-many selection. Compact rows use a transform-only thumb; wrapping
 * controls use direct selected surfaces so selection remains unambiguous.
 *
 * Uses lucide glyphs + a text label — never emoji, which are font-dependent
 * and unthemeable (§02.8).
 */
export function SegmentedControl<T extends string>({
  label,
  segments,
  value,
  onChange,
  large = false,
  showLabel = true,
}: Props<T>) {
  const { colors } = useTheme();
  const motion = useMotion();
  const [containerWidth, setContainerWidth] = useState(0);

  const activeIndex = segments.findIndex((segment) => segment.value === value);
  const segmentWidth = segments.length > 0 ? (containerWidth - spacing.sm * (segments.length - 1)) / segments.length : 0;
  const onContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth((current) => (current === width ? current : width));
  }, []);

  const thumbStyle = useAnimatedStyle(() => {
    const config = {
      duration: motion.duration.feedback,
      easing: Easing.bezier(...motion.easing.standard),
    };
    return {
      opacity: containerWidth > 0 && activeIndex >= 0 ? 1 : 0,
      transform: [{ translateX: withTiming(activeIndex * (segmentWidth + spacing.sm), config) }],
    };
  }, [activeIndex, containerWidth, motion, segmentWidth]);

  return (
    <View style={{ gap: spacing.xs }}>
      {showLabel ? (
        <Text variant="label" tone="muted">
          {label}
        </Text>
      ) : null}

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        onLayout={large ? undefined : onContainerLayout}
        style={{
          position: 'relative',
          flexDirection: 'row',
          flexWrap: large ? 'wrap' : 'nowrap',
          gap: spacing.sm,
        }}
      >
        {!large ? (
          <Animated.View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              {
                position: 'absolute',
                top: 0,
                left: 0,
                width: segmentWidth,
                bottom: 0,
                borderRadius: radius.md,
                backgroundColor: colors.primaryFill,
                borderWidth: 2,
                borderColor: colors.primary,
              },
              thumbStyle,
            ]}
          />
        ) : null}

        {segments.map((segment) => {
          const active = value === segment.value;
          const Icon = segment.icon;
          return (
            <Pressable
              key={segment.value}
              onPress={() => {
                if (active) return;
                onChange(segment.value);
                void Haptics.selectionAsync();
              }}
              accessibilityRole="radio"
              accessibilityLabel={segment.label}
              accessibilityState={{ selected: active, checked: active }}
              style={({ pressed }) => ({
                flex: large ? undefined : 1,
                flexGrow: large ? 1 : undefined,
                flexBasis: large ? '46%' : 0,
                minHeight: large ? 64 : HIT_SLOP_MIN,
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xs,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.sm,
                borderRadius: radius.md,
                borderWidth: large && active ? 2 : active ? 0 : 1,
                borderColor: large && active ? colors.primary : colors.borderStrong,
                backgroundColor: large && active ? colors.primaryFill : !active && pressed ? colors.elevated : 'transparent',
              })}
            >
              {Icon ? (
                <Icon
                  size={iconSize.md}
                  color={active ? colors.onPrimary : colors.mutedForeground}
                  strokeWidth={2}
                  accessible={false}
                />
              ) : null}
              <Text variant="bodySm" tone={active ? 'onPrimary' : 'default'}>
                {segment.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
