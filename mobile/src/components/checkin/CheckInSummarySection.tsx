import { View } from 'react-native';

import { Text } from '@/components/ui';
import { spacing } from '@/theme';

type SummaryRow = readonly [label: string, value: string];
type Props = { title: string; rows: readonly SummaryRow[] };

export function CheckInSummarySection({ title, rows }: Props) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label" tone="muted">{title}</Text>
      {rows.map(([label, value]) => (
        <View
          key={label}
          accessible
          accessibilityLabel={`${label}: ${value}`}
          style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm }}
        >
          <Text
            variant="bodySm"
            tone="muted"
            style={{ flex: 1, flexShrink: 1, minWidth: 0, maxWidth: '48%' }}
          >
            {label}
          </Text>
          <Text
            variant="bodySm"
            numeric
            style={{ flex: 1, flexShrink: 1, minWidth: 0, maxWidth: '48%', textAlign: 'right' }}
          >
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
}
