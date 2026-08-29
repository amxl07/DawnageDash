import { format } from 'date-fns';
import { memo, useCallback, useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { Sheet, SheetFlatList, Text } from '@/components/ui';
import { buildConsistencyHistory, type ConsistencyDay } from '@/lib/consistency';
import type { ProcessedCheckIn } from '@/lib/checkin-utils';
import { HIT_SLOP_MIN, spacing, useTheme } from '@/theme';

const HistoryRow = memo(function HistoryRow({
  day,
  onSelectDay,
}: {
  day: ConsistencyDay;
  onSelectDay: (dateString: string) => void;
}) {
  const { colors } = useTheme();
  const title = format(day.date, 'EEEE d MMMM');
  const unavailable = !day.inRange;
  const subtitle = unavailable ? 'Not available before your check-in history' : day.label;

  return (
    <Pressable
      disabled={unavailable}
      onPress={() => onSelectDay(day.dateString)}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}`}
      accessibilityState={{ disabled: unavailable }}
      style={({ pressed }) => ({
        minHeight: HIT_SLOP_MIN,
        justifyContent: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm,
        opacity: unavailable ? 0.45 : 1,
        backgroundColor: pressed ? colors.elevated : 'transparent',
      })}
    >
      <Text>{title}</Text>
      <Text variant="bodySm" tone="muted">
        {subtitle}
      </Text>
    </Pressable>
  );
});

export function CheckInHistorySheet({
  visible,
  processed,
  onClose,
  onSelectDay,
}: {
  visible: boolean;
  processed: ProcessedCheckIn[];
  onClose: () => void;
  onSelectDay: (dateString: string) => void;
}) {
  const history = useMemo(() => buildConsistencyHistory(processed), [processed]);
  const select = useCallback(
    (dateString: string) => {
      onSelectDay(dateString);
      onClose();
    },
    [onClose, onSelectDay],
  );

  return (
    <Sheet visible={visible} onClose={onClose} title="Check-in history">
      <View style={{ paddingHorizontal: spacing.base, paddingVertical: spacing.sm }}>
        <Text variant="bodySm" tone="muted">
          Select a day to view or update its check-in.
        </Text>
      </View>
      <SheetFlatList
        data={history}
        keyExtractor={(item) => item.dateString}
        renderItem={({ item }) => <HistoryRow day={item} onSelectDay={select} />}
        initialNumToRender={14}
        windowSize={7}
      />
    </Sheet>
  );
}
