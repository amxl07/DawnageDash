import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

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
};

type Rect = { x: number; y: number; width: number; height: number };

/**
 * One-of-many selection with a thumb that travels to the active segment.
 *
 * The thumb animates x, y, width AND height — width because labels differ in
 * length, and y/height because `large` wraps into a grid where the selection
 * can move between rows. Measuring per segment with onLayout is what makes
 * unequal labels work; a fixed-fraction thumb would drift.
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
}: Props<T>) {
  const { colors } = useTheme();
  const motion = useMotion();
  const [rects, setRects] = useState<Record<number, Rect>>({});

  const activeIndex = segments.findIndex((s) => s.value === value);
  const activeRect = activeIndex >= 0 ? rects[activeIndex] : undefined;

  const onSegmentLayout = useCallback((index: number, e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    setRects((prev) => {
      const p = prev[index];
      if (p && p.x === x && p.y === y && p.width === width && p.height === height) return prev;
      return { ...prev, [index]: { x, y, width, height } };
    });
  }, []);

  const thumbStyle = useAnimatedStyle(() => {
    if (!activeRect) return { opacity: 0 };
    const cfg = { duration: motion.duration.enter, easing: Easing.bezier(...motion.easing.standard) };
    return {
      opacity: 1,
      transform: [
        { translateX: withTiming(activeRect.x, cfg) },
        { translateY: withTiming(activeRect.y, cfg) },
      ],
      width: withTiming(activeRect.width, cfg),
      height: withTiming(activeRect.height, cfg),
    };
  }, [activeRect, motion]);

  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="label" tone="muted">
        {label}
      </Text>

      <View
        accessibilityRole="radiogroup"
        style={{
          position: 'relative',
          flexDirection: 'row',
          flexWrap: large ? 'wrap' : 'nowrap',
          gap: spacing.sm,
        }}
      >
        {/* Travels to the active segment. Hidden until the first measurement
            lands, so it never flashes at 0×0 in the corner. */}
        <Animated.View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              borderRadius: radius.md,
              backgroundColor: colors.primaryFill,
              borderWidth: 2,
              borderColor: colors.primary,
            },
            thumbStyle,
          ]}
        />

        {segments.map((seg, index) => {
          const active = value === seg.value;
          const Icon = seg.icon;
          return (
            <Pressable
              key={seg.value}
              onLayout={(e) => onSegmentLayout(index, e)}
              onPress={() => {
                onChange(seg.value);
                void Haptics.selectionAsync();
              }}
              accessibilityRole="radio"
              accessibilityLabel={seg.label}
              accessibilityState={{ selected: active, checked: active }}
              style={({ pressed }) => ({
                flexGrow: 1,
                flexBasis: large ? '46%' : 0,
                minHeight: large ? 64 : HIT_SLOP_MIN,
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xs,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.sm,
                borderRadius: radius.md,
                // The thumb supplies the active outline; an inactive segment
                // keeps its own so the control still reads as a set of choices.
                borderWidth: active ? 0 : 1,
                borderColor: colors.borderStrong,
                backgroundColor: !active && pressed ? colors.elevated : 'transparent',
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
                {seg.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
