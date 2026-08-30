import { useQuery, useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { format, startOfWeek } from 'date-fns';
import { useRouter } from 'expo-router';
import { CalendarDays, ChevronDown, Dumbbell, Plus } from 'lucide-react-native';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, FlatList, Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';

import { MetricCard } from '@/components/dashboard/MetricCard';
import {
  AdaptiveGrid,
  AnimatedFlatList,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  SkeletonCard,
  StatusPill,
  Text,
  useListMotion,
} from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { localDateString, parseLocalDate } from '@/lib/dates';
import { flushOutbox, readOutbox } from '@/lib/outbox';
import { supabase } from '@/lib/supabase';
import { parseWorkoutContent } from '@/lib/workout-content';
import { iconSize, spacing, useTheme } from '@/theme';

type LogRow = { id: string; date: string; title: string | null; content: string | null };

/** Renders all three historical content shapes without crashing. */
const LogCard = memo(function LogCard({ log, onEdit }: { log: LogRow; onEdit: () => void }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const parsed = useMemo(() => parseWorkoutContent(log.content), [log.content]);
  const exerciseCount = parsed.kind === 'exercises' ? parsed.exercises.length : 0;

  return (
    <Card style={{ gap: spacing.md, marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Pressable
          onPress={() => setOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={`${log.title ?? 'Workout'}, ${format(parseLocalDate(log.date), 'd MMMM yyyy')}, ${exerciseCount} exercises`}
          accessibilityState={{ expanded: open }}
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            minHeight: 44,
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <View style={{ alignItems: 'center', width: 44 }}>
            <Text variant="h2" numeric>{format(parseLocalDate(log.date), 'd')}</Text>
            <Text variant="label" tone="muted">{format(parseLocalDate(log.date), 'MMM')}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text>{log.title || 'Workout'}</Text>
            <Text variant="bodySm" tone="muted">
              {exerciseCount ? `${exerciseCount} exercises` : 'View details'}
            </Text>
          </View>
          <ChevronDown
            size={iconSize.md}
            color={colors.mutedForeground}
            strokeWidth={2}
            style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
            accessible={false}
          />
        </Pressable>
        <Pressable
          onPress={onEdit}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${log.title ?? 'workout'}`}
          style={{ minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <Text variant="bodySm" tone="primary">Edit</Text>
        </Pressable>
      </View>

      {open ? (
        <View style={{ gap: spacing.md }}>
          {parsed.kind === 'text' ? (
            <Text variant="bodySm" tone="muted">
              {parsed.text}
            </Text>
          ) : (
            parsed.exercises.map((ex, i) => (
              <View
                key={i}
                style={{ gap: spacing.xs, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}
              >
                <Text>{ex.name}</Text>
                {ex.sets.length ? (
                  ex.sets.map((s) => (
                    <Text key={s.setNumber} variant="bodySm" tone="muted" numeric>
                      Set {s.setNumber}: {s.weight || '—'} kg × {s.reps || '—'}
                      {s.rpe ? ` @ RPE ${s.rpe}` : ''}
                    </Text>
                  ))
                ) : ex.legacy ? (
                  // Legacy object format.
                  <Text variant="bodySm" tone="muted" numeric>
                    {[
                      ex.legacy.sets && `${ex.legacy.sets} sets`,
                      ex.legacy.reps && `${ex.legacy.reps} reps`,
                      ex.legacy.weight && `${ex.legacy.weight} kg`,
                      ex.legacy.duration,
                      ex.legacy.rest && `rest ${ex.legacy.rest}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                ) : (
                  <Text variant="bodySm" tone="muted">
                    {ex.raw}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>
      ) : null}
    </Card>
  );
});

export default function LogsScreen() {
  const { colors } = useTheme();
  const listMotion = useListMotion();
  const listRef = useRef<FlatList<LogRow>>(null);
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(0);

  useScrollToTop(listRef);

  const { data: logs, isLoading, isError, refetch } = useQuery({
    queryKey: ['workoutLogs', user?.id],
    queryFn: async (): Promise<LogRow[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('workout_logs')
        .select('id, date, title, content')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as LogRow[];
    },
    enabled: !!user?.id,
  });

  // Pending outbox state must be VISIBLE — a silent queue is worse than none.
  const refreshPending = useCallback(
    () => void readOutbox().then((items) => setPending(items.length)),
    [],
  );
  useFocusEffect(refreshPending);
  useEffect(() => {
    refreshPending();
    const appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        void flushOutbox().then((n) => {
          refreshPending();
          if (n > 0) void queryClient.invalidateQueries({ queryKey: ['workoutLogs'] });
        }).catch(refreshPending);
      }
    });
    const netSub = NetInfo.addEventListener((s) => {
      if (s.isConnected) {
        void flushOutbox().then((n) => {
          refreshPending();
          if (n > 0) void queryClient.invalidateQueries({ queryKey: ['workoutLogs'] });
        }).catch(refreshPending);
      }
    });
    return () => {
      appSub.remove();
      netSub();
    };
  }, [queryClient, refreshPending]);

  const metrics = useMemo(() => {
    const all = logs ?? [];
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const thisWeek = all.filter((l) => parseLocalDate(l.date) >= weekStart).length;
    return {
      total: all.length,
      thisWeek,
    };
  }, [logs]);

  if (isLoading) {
    return (
      <Screen archetype="root">
        <SkeletonCard lines={2} />
        <View style={{ height: spacing.base }} />
        <SkeletonCard lines={3} />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen archetype="root">
        <ErrorState onRetry={refetch} />
      </Screen>
    );
  }

  const header = (
    <View style={{ gap: spacing.base, marginBottom: spacing.base }}>
      <Text variant="h1">Workout logs</Text>

      {pending > 0 ? (
        <Animated.View
          entering={listMotion.enabled ? FadeInDown.duration(240) : undefined}
          exiting={listMotion.enabled ? FadeOutUp.duration(200) : undefined}
          layout={listMotion.enabled ? LinearTransition.duration(240) : undefined}
        >
          <StatusPill
            status="offline"
            label={`${pending} workouts saved here · waiting to sync`}
          />
        </Animated.View>
      ) : null}

      <AdaptiveGrid>
        <MetricCard icon={Dumbbell} label="All workouts" value={String(metrics.total)} trend={{ value: 0, goodDirection: 'up', caption: 'logged' }} />
        <MetricCard icon={CalendarDays} label="This week" value={String(metrics.thisWeek)} trend={{ value: 0, goodDirection: 'up', caption: 'workouts' }} />
      </AdaptiveGrid>

      <Button
        label="Log a workout"
        icon={<Plus size={iconSize.md} color={colors.onPrimary} strokeWidth={2.5} />}
        onPress={() => router.push({ pathname: '/(app)/logger', params: { date: localDateString() } })}
      />
    </View>
  );

  return (
    <Screen archetype="root" scroll={false}>
      <AnimatedFlatList
        ref={listRef}
        data={logs ?? []}
        keyExtractor={(l) => l.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <LogCard
            log={item}
            onEdit={() =>
              router.push({ pathname: '/(app)/logger', params: { date: item.date } })
            }
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={null}
            title="No workouts logged yet"
            message="Log your first session and you'll start seeing previous-session numbers to beat."
            actionLabel="Log a workout"
            onAction={() => router.push({ pathname: '/(app)/logger', params: { date: localDateString() } })}
          />
        }
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        windowSize={7}
        itemLayoutAnimation={listMotion.itemLayoutAnimation}
      />
    </Screen>
  );
}
