import { format } from 'date-fns';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { parseLocalDate } from '@/lib/dates';
import { MEASUREMENT_FIELDS } from '@/lib/measurement-validation';
import { spacing } from '@/theme';
import { num, type BodyMeasurement } from '@/types/db';

type Props = {
  row: BodyMeasurement;
  weekNumber: number;
  onEdit: () => void;
};

function MeasurementHistoryRowInner({ row, weekNumber, onEdit }: Props) {
  const values = MEASUREMENT_FIELDS.map(
    (field) => `${field.label} ${num(row[field.key]) || '—'}`,
  ).join(', ');

  return (
    <Pressable
      onPress={onEdit}
      accessibilityRole="button"
      accessibilityLabel={`Week ${weekNumber}, ${format(parseLocalDate(row.date), 'd MMMM yyyy')}. ${values}. Tap to edit.`}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, marginBottom: spacing.md })}
    >
      <Card style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="h2">
            Week {weekNumber}
            {weekNumber === 0 ? ' · Baseline' : ''}
          </Text>
          <Text variant="bodySm" tone="muted">
            {format(parseLocalDate(row.date), 'd MMM yyyy')}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {MEASUREMENT_FIELDS.map((field) => (
            <View key={field.key} style={{ minWidth: 64 }}>
              <Text variant="label" tone="muted">
                {field.label}
              </Text>
              <Text variant="bodySm" numeric>
                {num(row[field.key]) ? `${num(row[field.key])} cm` : '—'}
              </Text>
            </View>
          ))}
        </View>
      </Card>
    </Pressable>
  );
}

export const MeasurementHistoryRow = memo(MeasurementHistoryRowInner);
