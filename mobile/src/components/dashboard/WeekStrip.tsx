import { format } from 'date-fns';
import { Check } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { WeekDay } from '@/lib/streak';
import { normalizeWorkoutStatus } from '@/types/db';
import { HIT_SLOP_MIN, radius, spacing, useTheme } from '@/theme';

type Props = { days: WeekDay[]; onSelectDay: (d: WeekDay) => void };

/**
 * Mon→Sun glance strip. Answers "how am I doing this week?" without a tap, and
 * costs no extra query — the data is already in processCheckInHistory.
 *
 * Each dot carries its state in its accessibilityLabel, so the colour is never
 * the only signal (§03.A.6).
 */
export function WeekStrip({ days, onSelectDay }: Props) {
  const { colors } = useTheme();

  const fillFor = (d: WeekDay) => {
    if (d.state !== 'done') return 'transparent';
    switch (normalizeWorkoutStatus(d.workoutStatus)) {
      case 'done':
        return colors.success;
      case 'cardio':
        return colors.chart4;
      case 'rest':
        return colors.gold;
      default:
        return colors.mutedForeground;
    }
  };

  const labelFor = (d: WeekDay) => {
    const date = format(d.date, 'EEEE d MMMM');
    if (d.state === 'future') return `${date}, upcoming`;
    if (d.state === 'done') {
      const s = normalizeWorkoutStatus(d.workoutStatus);
      const word = s === 'done' ? 'workout done' : s === 'cardio' ? 'cardio' : s === 'rest' ? 'rest day' : 'no workout';
      return `${date}, checked in, ${word}. Tap to edit.`;
    }
    if (d.state === 'today-pending') return `${date}, today, not checked in yet. Tap to check in.`;
    return `${date}, no check-in. Tap to add it.`;
  };

  return (
    <Card style={{ gap: spacing.md }}>
      <Text variant="label" tone="muted">
        This week
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {days.map((d) => {
          const isToday = d.state === 'today-pending';
          const done = d.state === 'done';
          const future = d.state === 'future';
          return (
            <Pressable
              key={d.dateString}
              disabled={future}
              onPress={() => onSelectDay(d)}
              accessibilityRole="button"
              accessibilityLabel={labelFor(d)}
              accessibilityState={{ disabled: future, selected: isToday }}
              style={{
                minWidth: HIT_SLOP_MIN,
                minHeight: HIT_SLOP_MIN,
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xs,
                opacity: future ? 0.35 : 1,
              }}
            >
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: radius.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: fillFor(d),
                  borderWidth: done ? 0 : isToday ? 2 : 1,
                  borderColor: isToday ? colors.primary : colors.borderStrong,
                }}
              >
                {done ? (
                  <Check size={16} color={colors.background} strokeWidth={3} accessible={false} />
                ) : null}
              </View>
              <Text variant="bodySm" tone={isToday ? 'primary' : 'muted'}>
                {d.initial}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
