import * as Haptics from 'expo-haptics';
import { Minus, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { HIT_SLOP_MIN, iconSize, radius, spacing, tabularNums, type, useTheme } from '@/theme';
import { Text } from './Text';

type Props = {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  step: number;
  min?: number;
  max?: number;
  /** Decimal places for display. */
  precision?: number;
  suffix?: string;
  /** Shown under the field, e.g. "last: 82.4 kg". */
  hint?: string;
};

/**
 * ± stepper with direct tap-to-type. The common path stays one tap, while
 * keyboard entry is visible rather than hidden behind a long press.
 */
export function Stepper({
  label,
  value,
  onChange,
  step,
  min = 0,
  max = 100000,
  precision = 1,
  suffix,
  hint,
}: Props) {
  const { colors } = useTheme();
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');

  const display = value === null ? '—' : value.toFixed(precision).replace(/\.0+$/, '');

  const bump = (delta: number) => {
    const base = value ?? 0;
    const next = Math.min(max, Math.max(min, Math.round((base + delta) * 1000) / 1000));
    onChange(next);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const commitDraft = () => {
    const parsed = parseFloat(draft.replace(',', '.'));
    onChange(draft.trim() === '' || !Number.isFinite(parsed) ? null : Math.min(max, Math.max(min, parsed)));
    setTyping(false);
  };

  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="label" tone="muted">
        {label}
      </Text>

      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: value === null ? 'Not set' : `${display}${suffix ? ` ${suffix}` : ''}` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'increment') bump(step);
          if (e.nativeEvent.actionName === 'decrement') bump(-step);
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          backgroundColor: colors.elevated,
          overflow: 'hidden',
        }}
      >
        <Pressable
          onPress={() => bump(-step)}
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={({ pressed }) => ({
            width: HIT_SLOP_MIN + 4,
            height: HIT_SLOP_MIN + 4,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? colors.card : 'transparent',
          })}
        >
          <Minus size={iconSize.md} color={colors.foreground} strokeWidth={2.5} />
        </Pressable>

        {typing ? (
          <TextInput
            autoFocus
            value={draft}
            onChangeText={setDraft}
            onBlur={commitDraft}
            onSubmitEditing={commitDraft}
            keyboardType="decimal-pad"
            returnKeyType="done"
            accessibilityLabel={`${label}, type a value`}
            style={[
              type.h2,
              tabularNums,
              { flex: 1, textAlign: 'center', color: colors.foreground, paddingVertical: spacing.sm },
            ]}
          />
        ) : (
          <Pressable
            onPress={() => {
              setDraft(value === null ? '' : String(value));
              setTyping(true);
            }}
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: HIT_SLOP_MIN }}
          >
            <Text variant="h2" numeric tone={value === null ? 'muted' : 'default'}>
              {display}
              {suffix && value !== null ? <Text variant="bodySm" tone="muted">{` ${suffix}`}</Text> : null}
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => bump(step)}
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={({ pressed }) => ({
            width: HIT_SLOP_MIN + 4,
            height: HIT_SLOP_MIN + 4,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? colors.card : 'transparent',
          })}
        >
          <Plus size={iconSize.md} color={colors.foreground} strokeWidth={2.5} />
        </Pressable>
      </View>

      {hint ? (
        <Text variant="bodySm" tone="muted">
          {hint} · tap the number to type
        </Text>
      ) : (
        <Text variant="bodySm" tone="muted">
          Tap the number to type
        </Text>
      )}
    </View>
  );
}
