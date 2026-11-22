import { Check, Clock3, Pencil, TriangleAlert } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { parseLocalDate } from '@/lib/dates';
import { spacing, useMotion, useTheme } from '@/theme';
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

export function WeekRecordStrip({ days, today, onSelect }: { days: RecordDay[]; today: string; onSelect: (date: string) => void }) {
  const { colors } = useTheme();
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    const index = days.findIndex((day) => day.date === today);
    if (index > 4) scroll.current?.scrollTo({ x: (index - 4) * 56, animated: false });
  }, [days, today]);
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
        <Text variant="bodySm" numeric tone="muted">{savedCount} of {days.length} saved</Text>
      </View>
      <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {days.map((day) => {
          const date = parseLocalDate(day.date);
          const selected = day.date === today;
          const future = day.date > today;
          const Icon = day.state === 'synced' ? Check : day.state === 'queued' ? Clock3 : day.state === 'draft' ? Pencil : day.state === 'blocked' ? TriangleAlert : null;
          return (
            <Pressable key={day.date} onPress={() => onSelect(day.date)} disabled={future}
              accessibilityRole="button" accessibilityState={{ selected, disabled: future }}
              accessibilityLabel={new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(date) + ', ' + (future ? 'upcoming' : labels[day.state])}
              style={({ pressed }) => [styles.day, { backgroundColor: pressed ? colors.pressed : selected ? colors.primarySoft : 'transparent', borderColor: selected ? colors.borderStrong : 'transparent', opacity: future ? 0.42 : 1 }]}>
              <Text variant="bodySm" tone={selected ? 'default' : 'muted'}>{new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date)}</Text>
              <Text variant="h2" numeric tone={selected ? 'primary' : 'default'}>{date.getDate()}</Text>
              <RhythmStatusMark state={day.state} color={stateColor(day)}>
                {Icon ? <Icon size={13} color={stateColor(day)} strokeWidth={2} /> : undefined}
              </RhythmStatusMark>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  summary: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  summaryLabel: { flexGrow: 1, flexShrink: 1 },
  strip: { gap: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  day: { minWidth: 48, minHeight: 100, paddingHorizontal: 6, paddingVertical: spacing.md, borderRadius: 20, borderWidth: 1, alignItems: 'center', gap: spacing.sm },
  marker: { height: 14, justifyContent: 'center', alignItems: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
