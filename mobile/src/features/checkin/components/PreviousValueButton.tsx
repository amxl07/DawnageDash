import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useNumericCommits } from './NumericCommitProvider';
import { HIT_SLOP_MIN, radius, spacing, useTheme } from '@/theme';

type Props = {
  label: string;
  value: number | null;
  unit?: string;
  onApply: (value: number) => void;
  date?: string;
  currentValue?: number | null;
  onRestore?: (value: number | null) => void;
};

function formatPreviousValue(value: number, unit?: string) {
  return `${value}${unit ? ` ${unit}` : ''}`;
}

export function PreviousValueButton({ label, value, unit, onApply, date, currentValue, onRestore }: Props) {
  const { colors } = useTheme();
  const commits = useNumericCommits();
  const [copied, setCopied] = useState(false);
  const previous = useRef<number | null>(null);
  useEffect(() => { if (currentValue !== value) setCopied(false); }, [currentValue, value]);
  if (value === null) return null;

  const formatted = formatPreviousValue(value, unit);
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
    <Pressable
      onPress={() => {
        if (copied && currentValue === value && !commits?.hasPending(label)) return;
        const transaction = commits?.replace(label, value);
        if (transaction && !transaction.applied) return;
        previous.current = transaction?.applied ? transaction.previous : currentValue ?? null;
        onApply(value);
        setCopied(true);
        void Haptics.selectionAsync();
      }}
      accessibilityRole="button"
      accessibilityLabel={`Use previous ${label} value, ${formatted}${date ? ', from ' + date : ''}`}
      style={({ pressed }) => ({
        minHeight: HIT_SLOP_MIN,
        minWidth: 0,
        maxWidth: '100%',
        flexShrink: 1,
        alignSelf: 'flex-start',
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.borderStrong,
        backgroundColor: pressed ? colors.pressed : 'transparent',
      })}
    >
      <Text variant="bodySm" tone="muted" style={{ flexShrink: 1 }}>{(copied ? 'Copied' : 'Use previous') + (date ? ' · ' + date : '') + ' · ' + formatted}</Text>
    </Pressable>
    {copied && onRestore ? <Pressable accessibilityRole="button" accessibilityLabel={'Undo copied ' + label} onPress={() => { const transaction = commits?.replace(label, previous.current); if (transaction && !transaction.applied) return; onRestore(previous.current); setCopied(false); }} style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: spacing.md, justifyContent: 'center', borderRadius: radius.sm, backgroundColor: pressed ? colors.primarySoft : 'transparent' })}>
      <Text variant="bodySm" tone="primary">Undo</Text>
    </Pressable> : null}
  </View>;
}
