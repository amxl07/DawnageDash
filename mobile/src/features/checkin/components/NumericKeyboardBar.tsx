import { InputAccessoryView, Platform, Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { HIT_SLOP_MIN, spacing, useTheme } from '@/theme';

/** iOS number/decimal pads have no return key; keep commit/navigation explicit. */
export function NumericKeyboardBar({ id, label, previous, next, onPrevious, onNext, onDone }: {
  id: string;
  label: string;
  previous: boolean;
  next: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onDone: () => void;
}) {
  const { colors } = useTheme();
  if (Platform.OS !== 'ios') return null;
  return <InputAccessoryView nativeID={id}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, backgroundColor: colors.card, borderTopWidth: 1, borderColor: colors.border }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {[
          { title: 'Previous', enabled: previous, onPress: onPrevious },
          { title: 'Next', enabled: next, onPress: onNext },
        ].map(({ title, enabled, onPress }) => <Pressable key={title} accessibilityRole="button" accessibilityLabel={`${title} field`} accessibilityState={{ disabled: !enabled }} disabled={!enabled} onPress={onPress} style={({ pressed }) => ({ minHeight: HIT_SLOP_MIN, minWidth: HIT_SLOP_MIN, paddingHorizontal: spacing.sm, justifyContent: 'center', opacity: enabled ? pressed ? 0.6 : 1 : 0.4 })}>
          <Text variant="label" tone="primary">{title}</Text>
        </Pressable>)}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Done editing ${label}`} onPress={onDone} style={({ pressed }) => ({ minHeight: HIT_SLOP_MIN, minWidth: HIT_SLOP_MIN, paddingHorizontal: spacing.sm, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
        <Text variant="label" tone="primary">Done</Text>
      </Pressable>
    </View>
  </InputAccessoryView>;
}
