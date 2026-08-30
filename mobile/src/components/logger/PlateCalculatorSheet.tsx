import { useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Sheet, SheetScrollView, Text } from '@/components/ui';
import { calculatePlates } from '@/lib/plate-calculator';
import { HIT_SLOP_MIN, radius, spacing, tabularNums, type, useTheme } from '@/theme';

type BarChoice = '15' | '20' | 'custom';

type Props = {
  visible: boolean;
  initialTargetKg: string;
  onClose: () => void;
  onUse: (targetKg: string) => void;
};

const AVAILABLE_PAIRS = [25, 20, 15, 10, 5, 2.5, 1.25];

const finiteNonnegative = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

export function PlateCalculatorSheet({
  visible,
  initialTargetKg,
  onClose,
  onUse,
}: Props) {
  const { colors } = useTheme();
  const [targetKg, setTargetKg] = useState(initialTargetKg);
  const [barChoice, setBarChoice] = useState<BarChoice>('20');
  const [customBarKg, setCustomBarKg] = useState('20');

  useEffect(() => {
    if (!visible) return;
    setTargetKg(initialTargetKg);
    setBarChoice('20');
    setCustomBarKg('20');
  }, [initialTargetKg, visible]);

  const calculation = useMemo(() => {
    const barText = barChoice === 'custom' ? customBarKg : barChoice;
    const barKg = finiteNonnegative(barText);
    if (barKg === null) {
      return { error: 'Enter a finite nonnegative bar weight.' } as const;
    }
    const target = finiteNonnegative(targetKg);
    if (target === null) {
      return { error: 'Enter a finite nonnegative target load.' } as const;
    }
    if (target < barKg) {
      return { error: 'Target load must be at least the bar weight.' } as const;
    }
    try {
      return { result: calculatePlates(target, barKg, AVAILABLE_PAIRS) } as const;
    } catch (error) {
      return {
        error:
          error instanceof RangeError && error.message.includes('decimal places')
            ? 'Use no more than 6 decimal places.'
            : 'This load cannot be calculated. Check the target and bar weights.',
      } as const;
    }
  }, [barChoice, customBarKg, targetKg]);

  const resultLabel = calculation.result
    ? `Per side: ${
        calculation.result.platesPerSide.length
          ? calculation.result.platesPerSide.map((plate) => `${plate} kg`).join(' + ')
          : 'no plates'
      }`
    : null;

  const selectStyle = (selected: boolean) => ({
    minHeight: HIT_SLOP_MIN,
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: selected ? colors.primary : colors.borderStrong,
    backgroundColor: selected ? colors.primaryFill : colors.card,
    borderRadius: radius.sm,
  });

  return (
    <Sheet visible={visible} onClose={onClose} title="Plate calculator">
      <SheetScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.base }}>
        <View style={{ gap: spacing.xs }}>
          <Text variant="label" tone="muted">
            Target load (kg)
          </Text>
          <TextInput
            value={targetKg}
            onChangeText={setTargetKg}
            keyboardType="decimal-pad"
            accessibilityLabel="Target load in kilograms"
            placeholder="e.g. 100"
            placeholderTextColor={colors.mutedForeground}
            style={[
              type.body,
              tabularNums,
              {
                minHeight: HIT_SLOP_MIN,
                color: colors.foreground,
                borderWidth: 1,
                borderColor: colors.borderStrong,
                borderRadius: radius.sm,
                paddingHorizontal: spacing.md,
              },
            ]}
          />
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="label" tone="muted">
            Bar weight
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {(['15', '20'] as const).map((choice) => {
              const selected = barChoice === choice;
              return (
                <Pressable
                  key={choice}
                  onPress={() => setBarChoice(choice)}
                  accessibilityRole="radio"
                  accessibilityLabel={`${choice} kilogram bar`}
                  accessibilityState={{ selected }}
                  style={selectStyle(selected)}
                >
                  <Text variant="bodySm" tone={selected ? 'onPrimary' : 'muted'}>
                    {choice} kg
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setBarChoice('custom')}
              accessibilityRole="radio"
              accessibilityLabel="Custom bar"
              accessibilityState={{ selected: barChoice === 'custom' }}
              style={selectStyle(barChoice === 'custom')}
            >
              <Text variant="bodySm" tone={barChoice === 'custom' ? 'onPrimary' : 'muted'}>
                Custom
              </Text>
            </Pressable>
          </View>
          {barChoice === 'custom' ? (
            <TextInput
              value={customBarKg}
              onChangeText={setCustomBarKg}
              keyboardType="decimal-pad"
              accessibilityLabel="Custom bar weight in kilograms"
              placeholder="Bar kg"
              placeholderTextColor={colors.mutedForeground}
              style={[
                type.body,
                tabularNums,
                {
                  minHeight: HIT_SLOP_MIN,
                  color: colors.foreground,
                  borderWidth: 1,
                  borderColor: colors.borderStrong,
                  borderRadius: radius.sm,
                  paddingHorizontal: spacing.md,
                },
              ]}
            />
          ) : null}
        </View>

        {calculation.error ? (
          <Text
            variant="bodySm"
            accessibilityLiveRegion="polite"
            style={{ color: colors.destructive }}
          >
            {calculation.error}
          </Text>
        ) : resultLabel ? (
          <View style={{ gap: spacing.xs }}>
            <Text
              variant="h2"
              numeric
              accessibilityLabel={resultLabel}
              accessibilityLiveRegion="polite"
            >
              {resultLabel}
            </Text>
            {calculation.result.remainderKg > 0 ? (
              <Text variant="bodySm" tone="muted" numeric>
                {`${calculation.result.remainderKg} kg remains from the requested total`}
              </Text>
            ) : (
              <Text variant="bodySm" tone="muted">
                Exact load
              </Text>
            )}
          </View>
        ) : null}

        <Pressable
          onPress={
            calculation.result
              ? () => {
                  onUse(targetKg.trim());
                  onClose();
                }
              : undefined
          }
          disabled={!calculation.result}
          accessibilityRole="button"
          accessibilityLabel="Use this load"
          accessibilityState={{ disabled: !calculation.result }}
          style={{
            minHeight: HIT_SLOP_MIN,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radius.sm,
            backgroundColor: calculation.result ? colors.primaryFill : colors.border,
          }}
        >
          <Text variant="bodySm" tone={calculation.result ? 'onPrimary' : 'muted'}>
            Use this load
          </Text>
        </Pressable>
      </SheetScrollView>
    </Sheet>
  );
}
