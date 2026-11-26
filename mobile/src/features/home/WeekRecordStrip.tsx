import { ArrowLeftRight, Check, Clock3, Pencil, TriangleAlert } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { parseLocalDate } from '@/lib/dates';
import { HIT_SLOP_MIN, spacing, useMotion, useTheme } from '@/theme';
import type { RecordDay } from './types';

const labels = { absent: 'No record', draft: 'Draft saved', queued: 'Waiting to sync', synced: 'Saved and synced', blocked: 'Needs attention' };
function RhythmStatusMark({
  state,
  color,
  children,
}: {
  state: RecordDay['state'];
  color: string;
  children?: React.ReactNode;
}) {
  const motion = useMotion();
  const previous = useRef(state);
  const scale = useSharedValue(1);
  useEffect(() => {
    const newlySynced = previous.current !== 'synced' && state === 'synced';
    cancelAnimation(scale);
    if (newlySynced && motion.enabled) {
      scale.set(0.82);
      scale.set(
        withTiming(1, {
          duration: motion.duration.enter,
          easing: Easing.bezier(...motion.easing.standard),
        }),
      );
    } else {
      scale.set(1);
    }
    previous.current = state;
    return () => cancelAnimation(scale);
  }, [motion.duration.enter, motion.easing.standard, motion.enabled, scale, state]);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <Animated.View style={[styles.marker, animatedStyle]} accessible={false}>
      {children ?? <View style={[styles.dot, { backgroundColor: color }]} />}
    </Animated.View>
  );
}

export function WeekRecordStrip({ days, today, onSelect, summary }: { days: RecordDay[]; today: string; onSelect: (date: string) => void; summary?: string }) {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const minimumWidth = Math.ceil(HIT_SLOP_MIN * Math.max(1, fontScale));
  const gapCount = Math.max(0, days.length - 1);
  const fits = availableWidth > 0 && minimumWidth * days.length <= availableWidth;
  // Reduce spacing before reducing a platform-sized touch target. Larger text
  // grows the cells and can opt back into scrolling even on a wide phone.
  const gap = fits && gapCount > 0
    ? Math.min(spacing.xs, (availableWidth - minimumWidth * days.length) / gapCount)
    : spacing.xs;
  const dayWidth = fits && days.length > 0
    ? (availableWidth - gap * gapCount) / days.length
    : minimumWidth;
  const contentWidth = dayWidth * days.length + gap * gapCount;
  const overflows = availableWidth > 0 && !fits;
  const todayIndex = days.findIndex((day) => day.date === today);
  const todayOffset = overflows && todayIndex >= 0
    ? Math.max(0, Math.min(contentWidth - availableWidth, todayIndex * (dayWidth + gap) + (dayWidth - availableWidth) / 2))
    : 0;
  const revealToday = useCallback(() => {
    if (availableWidth > 0) scroll.current?.scrollTo({ x: todayOffset, animated: false });
  }, [availableWidth, todayOffset]);
  useEffect(revealToday, [revealToday]);
  const savedCount = days.filter((day) =>
    day.state === 'synced' || day.state === 'queued' || day.state === 'blocked',
  ).length;
  const stateColor = (day: RecordDay) =>
    day.state === 'blocked'
      ? colors.destructive
      : day.state === 'queued'
        ? colors.gold
        : day.state === 'synced'
          ? colors.primary
          : colors.borderStrong;
  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <Text variant="label" style={styles.summaryLabel}>Check-ins this week</Text>
        <Text variant="bodySm" numeric tone="muted">{summary ?? `${savedCount} of ${days.length} saved`}</Text>
      </View>
      <ScrollView ref={scroll} testID="week-record-strip" horizontal scrollEnabled={overflows}
        showsHorizontalScrollIndicator={overflows}
        onLayout={(event) => setAvailableWidth(event.nativeEvent.layout.width)}
        onContentSizeChange={revealToday}
        contentContainerStyle={[styles.strip, { gap }]}>
        {days.map((day) => {
          const date = parseLocalDate(day.date);
          const selected = day.date === today;
          const future = day.date > today;
          const Icon = day.state === 'synced' ? Check : day.state === 'queued' ? Clock3 : day.state === 'draft' ? Pencil : day.state === 'blocked' ? TriangleAlert : null;
          return (
            <Pressable key={day.date} onPress={() => onSelect(day.date)} disabled={future}
              accessibilityRole="button" accessibilityState={{ selected, disabled: future }}
              accessibilityLabel={new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(date) + ', ' + (future ? 'upcoming' : labels[day.state])}
              style={({ pressed }) => [styles.day, { width: dayWidth, minWidth: HIT_SLOP_MIN, backgroundColor: pressed ? colors.pressed : selected ? colors.primarySoft : 'transparent', borderColor: selected ? colors.borderStrong : 'transparent', opacity: future ? 0.42 : 1 }]}>
              <Text variant="bodySm" tone={selected ? 'default' : 'muted'} style={styles.weekday}>{new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date)}</Text>
              <Text variant="h2" numeric tone={selected ? 'primary' : 'default'}>{date.getDate()}</Text>
              <RhythmStatusMark state={day.state} color={stateColor(day)}>
                {Icon ? <Icon size={13} color={stateColor(day)} strokeWidth={2} /> : undefined}
              </RhythmStatusMark>
            </Pressable>
          );
        })}
      </ScrollView>
      {overflows ? <View style={styles.scrollHint}>
        <ArrowLeftRight size={16} color={colors.mutedForeground} accessible={false} />
        <Text variant="caption" tone="muted" style={styles.scrollHintCopy}>Scroll to see all days</Text>
      </View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  summary: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  summaryLabel: { flexGrow: 1, flexShrink: 1 },
  strip: { paddingTop: spacing.sm, paddingBottom: spacing.xs },
  day: { minHeight: 88, paddingHorizontal: 6, paddingVertical: spacing.sm, borderRadius: 24, alignItems: 'center', gap: spacing.xs },
  weekday: { maxWidth: '100%', textAlign: 'center' },
  scrollHint: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  scrollHintCopy: { flex: 1, minWidth: 0 },
  marker: { height: 14, justifyContent: 'center', alignItems: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
