import * as Haptics from 'expo-haptics';
import { Host, Picker, Text as NativeText } from '@expo/ui/swift-ui';
import { accessibilityLabel, controlSize, frame, pickerStyle, tag, tint } from '@expo/ui/swift-ui/modifiers';
import { View } from 'react-native';

import { spacing, useTheme } from '@/theme';
import { SegmentedControlFallback } from './SegmentedControlFallback';
import type { SegmentedControlProps } from './SegmentedControl.types';
import { Text } from './Text';

export function SegmentedControl<T extends string>({ label, segments, value, onChange, large = false, showLabel = true }: SegmentedControlProps<T>) {
  const { colors, isDark } = useTheme();
  const hasMatchingSelection = value !== null && segments.some((segment) => segment.value === value);
  if (large || !hasMatchingSelection || segments.some((segment) => segment.icon !== undefined)) {
    return <SegmentedControlFallback {...{ label, segments, value, onChange, large, showLabel }} />;
  }

  return (
    <View style={{ gap: spacing.xs }}>
      {showLabel ? <Text variant="label" tone="muted">{label}</Text> : null}
      <Host matchContents={{ vertical: true }} colorScheme={isDark ? 'dark' : 'light'} seedColor={colors.primary} style={{ alignSelf: 'stretch' }}>
        <Picker label={label} selection={value} onSelectionChange={(next) => {
          if (next === null || next === value) return;
          onChange(next as T);
          void Haptics.selectionAsync();
        }} modifiers={[pickerStyle('segmented'), controlSize('large'), frame({ minHeight: 44 }), tint(colors.primary), accessibilityLabel(label)]}>
          {segments.map((segment) => <NativeText key={segment.value} modifiers={[tag(segment.value)]}>{segment.label}</NativeText>)}
        </Picker>
      </Host>
    </View>
  );
}

export type { Segment, SegmentedControlProps } from './SegmentedControl.types';
