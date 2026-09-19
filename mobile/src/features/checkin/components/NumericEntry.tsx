import { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { Input, Text } from '@/components/ui';
import { HIT_SLOP_MIN, radius, spacing, useTheme } from '@/theme';

import type { HistoryStat } from '../history';
import { HistoryCaption } from './HistoryCaption';
import { useNumericCommits, type NumericCommitOptions } from './NumericCommitProvider';

type Bounds = {
  min?: number;
  max?: number;
  precision: number;
};

type Props = Bounds & {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  unit?: string;
  error?: string;
  hint?: string;
  history?: HistoryStat;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  focusTarget?: (node: TextInput | null) => void;
  quickValues?: readonly number[];
};

export function normalizeNumericDraft(draft: string, { min, max, precision }: Bounds): number | null {
  if (draft.trim() === '') return null;
  const parsed = Number(draft.replace(',', '.'));
  if (!Number.isFinite(parsed)) return null;
  const bounded = Math.min(max ?? parsed, Math.max(min ?? parsed, parsed));
  return Number(bounded.toFixed(precision));
}

export function NumericEntry({
  label,
  value,
  onChange,
  unit,
  min,
  max,
  precision,
  error,
  hint,
  history,
  style,
  children,
  focusTarget,
  quickValues,
}: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(value === null ? '' : String(value));
  const [inputError, setInputError] = useState<string | undefined>();
  const [adjustment, setAdjustment] = useState<string | undefined>();
  const input = useRef<TextInput>(null);
  const changed = useRef(false);
  const draftRef = useRef(draft);
  const commits = useNumericCommits();
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (!focused) { const text = value === null ? '' : String(value); setDraft(text); draftRef.current = text; }
  }, [focused, value]);

  const commit = (options?: NumericCommitOptions) => {
    if (!changed.current) { if (!options?.preserveEditing) setFocused(false); return true; }
    const raw = draftRef.current;
    const parsed = Number(raw.replace(',', '.'));
    if (raw.trim() && !Number.isFinite(parsed)) {
      if (!options?.preserveEditing) { setInputError('Enter a number or clear this field.'); input.current?.focus(); }
      return false;
    }
    const next = normalizeNumericDraft(raw, { min, max, precision });
    // Background acknowledgment may persist a complete value, but must not
    // clamp or round an unfinished spelling while the person is still typing.
    if (options?.preserveEditing && next !== null && parsed !== next) return false;
    setAdjustment(next !== null && parsed !== next ? 'Adjusted to ' + next + (unit ? ' ' + unit : '') + '.' : undefined);
    setInputError(undefined);
    changed.current = false;
    valueRef.current = next;
    onChange(next);
    commits?.settle(label);
    if (options?.preserveEditing) return true;
    setDraft(next === null ? '' : String(next));
    draftRef.current = next === null ? '' : String(next);
    setFocused(false);
    return true;
  };
  const commitRef = useRef(commit);
  commitRef.current = commit;
  const replaceRef = useRef<(next: number | null) => void>(() => {});
  replaceRef.current = (next) => {
    valueRef.current = next;
    changed.current = false;
    const text = next === null ? '' : String(next);
    draftRef.current = text;
    setDraft(text);
    setInputError(undefined);
    setAdjustment(undefined);
  };
  const selectQuickValue = (next: number) => {
    replaceRef.current(next);
    onChange(next);
    commits?.settle(label);
  };
  useEffect(() => commits?.register(label, (options) => commitRef.current(options), {
    read: () => valueRef.current,
    replace: (next) => replaceRef.current(next),
  }), [commits, label]);

  return (
    <View style={[{ gap: spacing.xs }, style]}>
      <Input
        ref={(node) => { input.current = node; focusTarget?.(node); }}
        label={label}
        value={draft}
        onChangeText={(text) => { commits?.stage(label); setFocused(true); changed.current = true; draftRef.current = text; setDraft(text); setInputError(undefined); setAdjustment(undefined); }}
        onFocus={() => setFocused(true)}
        onBlur={() => commit()}
        onSubmitEditing={() => commit()}
        keyboardType={precision > 0 ? 'decimal-pad' : 'number-pad'}
        returnKeyType="done"
        placeholder={unit ? `Enter ${unit}` : 'Enter value'}
        error={inputError || error}
        hint={adjustment || hint}
      />
      {quickValues?.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {quickValues.map((quickValue) => {
            const quickLabel = `${quickValue}${unit ? ` ${unit}` : ''}`;
            const selected = !changed.current && valueRef.current === quickValue;
            return (
              <Pressable
                key={quickValue}
                accessibilityRole="button"
                accessibilityLabel={quickLabel}
                accessibilityState={{ selected }}
                onPress={() => selectQuickValue(quickValue)}
                style={({ pressed }) => ({
                  minHeight: HIT_SLOP_MIN,
                  minWidth: HIT_SLOP_MIN,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: selected ? colors.primary : colors.borderStrong,
                  backgroundColor: selected ? colors.primaryFill : pressed ? colors.elevated : 'transparent',
                })}
              >
                <Text variant="label" tone={selected ? 'onPrimary' : 'default'} numeric>{quickLabel}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <HistoryCaption value={value} history={history} unit={unit} precision={precision} />
      {children}
    </View>
  );
}
