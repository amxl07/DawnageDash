import { memo, useEffect, useMemo, useRef } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Animated, {
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Card, Text } from '@/components/ui';
import {
  buildConsistencyHistory,
  consistencyLevelLabel,
  type ConsistencyDay,
  type ConsistencyLevel,
} from '@/lib/consistency';
import type { ProcessedCheckIn } from '@/lib/checkin-utils';
import { horizontalInset, radius, spacing, useMotion, useTheme } from '@/theme';

/** A screen-width-safe, visual-only snapshot of check-in consistency. */

const DAYS_IN_WEEK = 7;
const CELL_GAP = 3;

const GridCell = memo(function GridCell({
  cell,
  size,
  palette,
  reveal,
}: {
  cell: ConsistencyDay;
  size: number;
  palette: string[];
  reveal: SharedValue<number>;
}) {
  const animated = useAnimatedStyle(() => ({
    opacity: cell.inRange ? interpolate(reveal.value, [0, 1], [0, 1]) : 0.25,
  }));

  if (!cell.inRange) {
    return <View accessible={false} style={{ width: size, height: size }} />;
  }

  return (
    <Animated.View
      accessible={false}
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius.sm / 2,
          backgroundColor: palette[cell.level],
        },
        animated,
      ]}
    />
  );
});

export function ConsistencyGrid({
  processed,
  onOpenHistory,
}: {
  processed: ProcessedCheckIn[];
  onOpenHistory: () => void;
}) {
  const { colors } = useTheme();
  const motion = useMotion();
  const { width } = useWindowDimensions();
  const reveal = useSharedValue(motion.enabled ? 0 : 1);
  const hasRevealed = useRef(false);

  useEffect(() => {
    if (hasRevealed.current) return;
    hasRevealed.current = true;
    reveal.value = motion.enabled ? withTiming(1, { duration: motion.duration.enter }) : 1;
  }, [motion.duration.enter, motion.enabled, reveal]);

  const palette = useMemo(
    () => [colors.border, colors.mutedForeground, colors.gold, colors.chart4, colors.success],
    [colors],
  );

  const { weeks, tracked, elapsed } = useMemo(() => {
    const available = width - horizontalInset(width) * 2 - spacing.base * 2;
    const cellSize = 12;
    const weekCount = Math.max(8, Math.floor(available / (cellSize + CELL_GAP)));
    const history = buildConsistencyHistory(processed, new Date(), weekCount);
    const chronological = [...history].reverse();
    const columns: ConsistencyDay[][] = [];

    for (let index = 0; index < chronological.length; index += DAYS_IN_WEEK) {
      columns.push(chronological.slice(index, index + DAYS_IN_WEEK));
    }

    const inRange = history.filter((day) => day.inRange);
    return {
      weeks: columns,
      tracked: inRange.filter((day) => day.level > 0).length,
      elapsed: inRange.length,
    };
  }, [processed, width]);

  if (!processed.length) return null;

  const pct = elapsed > 0 ? Math.round((tracked / elapsed) * 100) : 0;

  return (
    <Pressable
      onPress={onOpenHistory}
      accessibilityRole="button"
      accessibilityLabel={`Consistency: ${tracked} of ${elapsed} days, ${pct} percent. Open check-in history.`}
      style={{ minHeight: 44 }}
    >
      <Card style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text variant="label" tone="muted" style={{ flex: 1 }}>
            Consistency
          </Text>
          <Text variant="bodySm" tone="muted" numeric>
            {tracked} of {elapsed} days · {pct}%
          </Text>
        </View>

        <View accessible={false} style={{ flexDirection: 'row', gap: CELL_GAP }}>
          {weeks.map((column, weekIndex) => (
            <View key={weekIndex} accessible={false} style={{ gap: CELL_GAP }}>
              {column.map((cell) => (
                <GridCell
                  key={cell.dateString}
                  cell={cell}
                  size={12}
                  palette={palette}
                  reveal={reveal}
                />
              ))}
            </View>
          ))}
        </View>

        <View accessible={false} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {([4, 3, 2, 1] as ConsistencyLevel[]).map((level) => (
            <View
              key={level}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  backgroundColor: palette[level],
                }}
              />
              <Text variant="bodySm" tone="muted">
                {consistencyLevelLabel[level]}
              </Text>
            </View>
          ))}
        </View>
      </Card>
    </Pressable>
  );
}
