import { useState } from 'react';
import { View } from 'react-native';

import { Input, OptionRow, RatingRow, Sheet, Text } from '@/components/ui';
import type { Question } from '@/lib/questionnaire-data';
import { spacing } from '@/theme';
import { Pressable } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { HIT_SLOP_MIN, iconSize, radius, useTheme } from '@/theme';

type Props = {
  question: Question;
  value: string | number | undefined;
  onChange: (v: string | number) => void;
  error?: string;
};

export function QuestionField({ question: q, value, onChange, error }: Props) {
  const { colors } = useTheme();
  const [selectOpen, setSelectOpen] = useState(false);
  const label = q.required ? `${q.text} *` : q.text;

  if (q.type === 'select') {
    return (
      <View style={{ gap: spacing.xs }}>
        <Text variant="label" tone="muted">
          {label}
        </Text>
        {q.description ? (
          <Text variant="bodySm" tone="muted">
            {q.description}
          </Text>
        ) : null}
        <Pressable
          onPress={() => setSelectOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={q.text}
          accessibilityValue={{ text: value ? String(value) : 'Not answered' }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: HIT_SLOP_MIN + 4,
            paddingHorizontal: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: error ? colors.destructive : colors.borderStrong,
            backgroundColor: colors.elevated,
          }}
        >
          <Text style={{ flex: 1 }} tone={value ? 'default' : 'muted'}>
            {value ? String(value) : 'Select an option…'}
          </Text>
          <ChevronDown size={iconSize.md} color={colors.mutedForeground} strokeWidth={2} accessible={false} />
        </Pressable>
        {error ? (
          <Text variant="bodySm" tone="primary">
            {error}
          </Text>
        ) : null}

        <Sheet
          visible={selectOpen}
          onClose={() => setSelectOpen(false)}
          title={q.text}
          heightRatio={0.6}
        >
          <View style={{ padding: spacing.base, gap: spacing.sm }}>
            {(q.options ?? []).map((opt) => (
              <OptionRow
                key={opt}
                label={opt}
                selected={value === opt}
                onPress={() => {
                  onChange(opt);
                  setSelectOpen(false);
                }}
              />
            ))}
          </View>
        </Sheet>
      </View>
    );
  }

  if (q.type === 'radio') {
    return (
      <View style={{ gap: spacing.sm }}>
        <Text variant="label" tone="muted">
          {label}
        </Text>
        {q.description ? (
          <Text variant="bodySm" tone="muted">
            {q.description}
          </Text>
        ) : null}
        {(q.options ?? []).map((opt) => (
          <OptionRow key={opt} label={opt} selected={value === opt} onPress={() => onChange(opt)} />
        ))}
        {error ? (
          <Text variant="bodySm" tone="primary">
            {error}
          </Text>
        ) : null}
      </View>
    );
  }

  if (q.type === 'rating') {
    return (
      <View style={{ gap: spacing.sm }}>
        <Text variant="label" tone="muted">
          {label}
        </Text>
        <RatingRow
          label={q.text}
          min={q.min ?? 1}
          max={q.max ?? 10}
          value={typeof value === 'number' ? value : null}
          onChange={onChange}
        />
        {error ? (
          <Text variant="bodySm" tone="primary">
            {error}
          </Text>
        ) : null}
      </View>
    );
  }

  const multiline = q.type === 'textarea';
  return (
    <Input
      label={label}
      hint={q.description}
      error={error}
      value={value === undefined || value === null ? '' : String(value)}
      onChangeText={onChange}
      placeholder={q.placeholder}
      keyboardType={q.type === 'number' ? 'decimal-pad' : 'default'}
      multiline={multiline}
      numberOfLines={multiline ? (q.rows ?? 4) : 1}
      inputStyle={multiline ? { minHeight: 96, textAlignVertical: 'top' } : undefined}
    />
  );
}
