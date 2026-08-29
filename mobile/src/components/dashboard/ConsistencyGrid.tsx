import { addDays, format, startOfWeek } from 'date-fns';
import { memo, useMemo } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { Card, Text } from '@/components/ui';
import type { ProcessedCheckIn } from '@/lib/checkin-utils';
import { localDateString } from '@/lib/dates';
import { normalizeWorkoutStatus } from '@/types/db';
import { horizontalInset, radius, spacing, useMotion, useTheme } from '@/theme';

/**
 * Consistency grid — a year of check-ins at a glance.
 *
 * Adapted from reactiive's github-contributions demo. Two deliberate changes:
 *
 * 1. Levels encode WORKOUT STATUS, not intensity. GitHub only has "how much";
 *    a coaching client cares "what kind" — a rest day is a plan being followed,
 *    not a gap. Colours match WeekStrip so the two read as one language.
 * 2. Sized to fit the screen rather than scrolling, so it is glanceable from
 *    the dashboard without interaction.
 *
 * Cells spring in on a diagonal wave (bottom-left to top-right), which reads as
 * the history filling in rather than a grid appearing.
 */

const DAYS_IN_WEEK = 7;
const CELL_GAP = 3;
const BASE_DELAY = 14;

const SPRING = { mass: 1.1, damping: 13, stiffness: 150 } as const;

type Level = 0 | 1 | 2 | 3 | 4;

type Cell = {
  date: Date;
  dateString: string;
  level: Level;
  inRange: boolean;
};

function levelFor(entry: ProcessedCheckIn | undefined): Level {
  if (!entry || entry.status !== 'done') return 0;
  switch (normalizeWorkoutStatus(entry.originalCheckIn?.workout_status)) {
    case 'done':
      return 4;
    case 'cardio':
      return 3;
    case 'rest':
      return 2;
    default:
      return 1; // checked in, but no training
  }
}

const LEVEL_WORD: Record<Level, string> = {
  0: 'no check-in',
  1: 'checked in, no training',
  2: 'rest day',
  3: 'cardio',
  4: 'workout done',
};

const GridCell = memo(function GridCell({
  cell,
  size,
  weekIndex,
  dayIndex,
  palette,
  onPress,
}: {
  cell: Cell;
  size: number;
  weekIndex: number;
  dayIndex: number;
  palette: string[];
  onPress: (c: Cell) => void;
}) {
  const motion = useMotion();
  const progress = useSharedValue(motion.enabled ? 0 : 1);

  useEffect(() => {
    if (!motion.enabled) {
      progress.value = 1;
      return;
    }
    // Diagonal wave: bottom-left to top-right.
    const delay = BASE_DELAY * (weekIndex + (DAYS_IN_WEEK - 1 - dayIndex));
    progress.value = withDelay(delay, withSpring(1, SPRING));
  }, [motion.enabled, weekIndex, dayIndex, progress]);

  const animated = useAnimatedStyle(() => ({
    opacity: cell.inRange ? interpolate(progress.value, [0, 1], [0, 1]) : 0.25,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.4, 1]) }],
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [palette[0], palette[cell.level]],
    ),
  }));

  if (!cell.inRange) {
    return <View style={{ width: size, height: size }} />;
  }

  return (
    <Pressable
      onPress={() => onPress(cell)}
      accessibilityRole="button"
      accessibilityLabel={`${format(cell.date, 'EEEE d MMMM')}, ${LEVEL_WORD[cell.level]}`}
      hitSlop={2}
    >
      <Animated.View
        style={[{ width: size, height: size, borderRadius: radius.sm / 2 }, animated]}
      />
    </Pressable>
  );
});

export function ConsistencyGrid({
  processed,
  onSelectDay,
}: {
  processed: ProcessedCheckIn[];
  onSelectDay: (dateString: string) => void;
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  // Palette indexed by level. Matches WeekStrip's language.
  const palette = useMemo(
    () => [colors.border, colors.mutedForeground, colors.gold, colors.chart4, colors.success],
    [colors],
  );

  // Fit as many whole weeks as the screen allows, ending today.
  const { weeks, cellSize, tracked, elapsed } = useMemo(() => {
    const available = width - horizontalInset(width) * 2 - spacing.base * 2;
    const size = 12;
    const weekCount = Math.max(8, Math.floor(available / (size + CELL_GAP)));

    const byDate = new Map(processed.map((p) => [p.dateString, p]));
    const today = new Date();
    // Last column is the week containing today.
    const lastWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const firstWeekStart = addDays(lastWeekStart, -(weekCount - 1) * 7);

    const earliest = processed.length
      ? processed[processed.length - 1].dateString
      : localDateString(today);
    const todayStr = localDateString(today);

    const cols: Cell[][] = [];
    let trackedCount = 0;
    let elapsedCount = 0;

    for (let w = 0; w < weekCount; w++) {
      const col: Cell[] = [];
      for (let d = 0; d < DAYS_IN_WEEK; d++) {
        const date = addDays(firstWeekStart, w * 7 + d);
        const dateString = localDateString(date);
        // Outside the user's history, or in the future.
        const inRange = dateString >= earliest && dateString <= todayStr;
        const entry = byDate.get(dateString);
        const level = levelFor(entry);
        if (inRange) {
          elapsedCount += 1;
          if (level > 0) trackedCount += 1;
        }
        col.push({ date, dateString, level, inRange });
      }
      cols.push(col);
    }

    return { weeks: cols, cellSize: size, tracked: trackedCount, elapsed: elapsedCount };
  }, [processed, width]);

  if (!processed.length) return null;

  const pct = elapsed > 0 ? Math.round((tracked / elapsed) * 100) : 0;
  const rangeLabel = `${weeks.length} weeks`;

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Text variant="label" tone="muted" style={{ flex: 1 }}>
          Consistency
        </Text>
        {/* The headline carries the gist so a screen reader gets it without
            traversing every cell; cells still carry per-day detail on demand. */}
        <Text variant="bodySm" tone="muted" numeric>
          {tracked} of {elapsed} days · {pct}%
        </Text>
      </View>

      <View
        accessible={false}
        style={{ flexDirection: 'row', gap: CELL_GAP }}
        accessibilityLabel={`Check-in history for the last ${rangeLabel}`}
      >
        {weeks.map((col, weekIndex) => (
          <View key={weekIndex} style={{ gap: CELL_GAP }}>
            {col.map((cell, dayIndex) => (
              <GridCell
                key={cell.dateString}
                cell={cell}
                size={cellSize}
                weekIndex={weekIndex}
                dayIndex={dayIndex}
                palette={palette}
                onPress={(c) => onSelectDay(c.dateString)}
              />
            ))}
          </View>
        ))}
      </View>

      {/* Legend — colour is never the only carrier of meaning. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {([4, 3, 2, 1] as Level[]).map((lvl) => (
          <View
            key={lvl}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                backgroundColor: palette[lvl],
              }}
            />
            <Text variant="bodySm" tone="muted">
              {LEVEL_WORD[lvl]}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
