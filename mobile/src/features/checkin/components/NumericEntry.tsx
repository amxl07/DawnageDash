import { useEffect, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Input } from '@/components/ui';
import { spacing } from '@/theme';

import type { HistoryStat } from '../history';
import { HistoryCaption } from './HistoryCaption';

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
}: Props) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(value === null ? '' : String(value));

  useEffect(() => {
    if (!focused) setDraft(value === null ? '' : String(value));
  }, [focused, value]);

  const commit = () => {
    const next = normalizeNumericDraft(draft, { min, max, precision });
    onChange(next);
    setDraft(next === null ? '' : String(next));
    setFocused(false);
  };

  return (
    <View style={[{ gap: spacing.xs }, style]}>
      <Input
        label={label}
        value={draft}
        onChangeText={setDraft}
        onFocus={() => setFocused(true)}
        onBlur={commit}
        onSubmitEditing={commit}
        keyboardType={precision > 0 ? 'decimal-pad' : 'number-pad'}
        returnKeyType="done"
        placeholder={unit ? `Enter ${unit}` : 'Enter value'}
        error={error}
        hint={hint}
      />
      <HistoryCaption value={value} history={history} unit={unit} precision={precision} />
      {children}
    </View>
  );
}
