import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { HIT_SLOP_MIN, iconSize, radius, spacing, useTheme } from '@/theme';
import { Text } from './Text';

export type Segment<T extends string> = { value: T; label: string; icon?: LucideIcon };

type Props<T extends string> = {
  label: string;
  segments: Segment<T>[];
  value: T | null;
  onChange: (v: T) => void;
  /** Stack as a grid of big targets rather than a compact row. */
  large?: boolean;
};

/**
 * One-of-many selection. Uses lucide glyphs + a text label — never emoji, which are
 * font-dependent and unthemeable (§02.8).
 */
export function SegmentedControl<T extends string>({
  label,
  segments,
  value,
  onChange,
  large = false,
}: Props<T>) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <View
        accessibilityRole="radiogroup"
        style={{ flexDirection: 'row', flexWrap: large ? 'wrap' : 'nowrap', gap: spacing.sm }}
      >
        {segments.map((seg) => {
          const active = value === seg.value;
          const Icon = seg.icon;
          return (
            <Pressable
              key={seg.value}
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
                borderWidth: active ? 2 : 1,
                borderColor: active ? colors.primary : colors.borderStrong,
                backgroundColor: active
                  ? colors.primaryFill
                  : pressed
                    ? colors.elevated
                    : 'transparent',
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
