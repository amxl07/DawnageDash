import { Flame } from 'lucide-react-native';
import { View } from 'react-native';

import { AnimatedNumber, Card, Text } from '@/components/ui';
import { iconSize, spacing, useTheme } from '@/theme';

type Props = {
  streak: number;
  dayNumber: number;
  weekNumber: number;
  checkedInToday: boolean;
};

/**
 * The streak is the emotional payload of a habit product, so it gets metric
 * treatment rather than a line of muted subtitle text.
 *
 * At zero there is no number to celebrate — showing "0 day streak" is a
 * scoreboard of failure. The block becomes a forward-looking prompt instead.
 */
export function StreakHero({ streak, dayNumber, weekNumber, checkedInToday }: Props) {
  const { colors } = useTheme();

  const meta = `Day ${dayNumber} · Week ${weekNumber}`;

  if (streak === 0) {
    return (
      <Card style={{ gap: spacing.md }}>
        <Text variant="label" tone="muted">
          {meta}
        </Text>
        <Text variant="h2">
          {checkedInToday ? "Today's logged — that's the streak started." : "Today's a fresh start"}
        </Text>
        {!checkedInToday ? (
          <Text variant="bodySm" tone="muted">
            One check-in begins it. Most of it is already filled in for you.
          </Text>
        ) : null}
      </Card>
    );
  }

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Flame size={iconSize.lg} color={colors.primary} strokeWidth={2} accessible={false} />
            <AnimatedNumber
              value={streak}
              variant="display"
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </View>
          <Text
            variant="label"
            tone="muted"
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            day streak
          </Text>
        </View>
        <Text variant="bodySm" tone="muted" numeric>
          {meta}
        </Text>
      </View>

      {/* One announcement for the whole block, in the order a person reads it. */}
      <View
        accessible
        accessibilityLabel={`${streak} day streak. ${meta}.${checkedInToday ? ' Checked in today.' : ' Not checked in today.'}`}
        style={{ height: 0 }}
      />
    </Card>
  );
}
