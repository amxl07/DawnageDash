import NetInfo from '@react-native-community/netinfo';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek } from 'date-fns';
import { useRouter } from 'expo-router';
import { useFocusEffect, useScrollToTop } from 'expo-router/react-navigation';
import { CalendarDays, Dumbbell, Plus } from 'lucide-react-native';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, FlatList, Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';

import { MetricCard } from '@/components/dashboard/MetricCard';
import { DisclosureChevron } from '@/components/ui/DisclosureChevron';
import { MotionReveal } from '@/components/ui/MotionReveal';
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
import { flushOutbox, readOutbox, type OutboxItem } from '@/lib/outbox';
import { supabase } from '@/lib/supabase';
import { parseWorkoutContent } from '@/lib/workout-content';
import { iconSize, spacing, useTheme } from '@/theme';

type LogRow = { id: string; date: string; title: string | null; content: string | null };

function loggedSetText(
  set: {
    setNumber: number;
    reps: string;
    weight: string;
    rpe: string;
    duration?: string;
    kind?: 'warmup' | 'work';
    completed: boolean;
  },
  tracking: 'weight-reps' | 'duration' | undefined,
): { visible: string; accessibility: string } {
  const setName = set.kind === 'warmup' ? `Warm-up ${set.setNumber}` : `Set ${set.setNumber}`;
  const completionVisible = set.completed ? ' · Completed' : '';
  const completionAccessibility = set.completed ? ', completed' : '';
  if (tracking === 'duration') {
    const duration = set.duration || '—';
    return {
      visible: `${setName}: ${duration} sec${completionVisible}`,
      accessibility: `${setName}, ${duration} seconds${completionAccessibility}`,
    };
  }

  const weight = set.weight || '—';
  const reps = set.reps || '—';
  return {
    visible: `${setName}: ${weight} kg × ${reps}${set.rpe ? ` @ RPE ${set.rpe}` : ''}${completionVisible}`,
    accessibility: `${setName}, ${weight} kilograms by ${reps} repetitions${set.rpe ? `, RPE ${set.rpe}` : ''}${completionAccessibility}`,
  };
}

/** Renders all three historical workout content shapes without crashing. */
export const LogCard = memo(function LogCard({ log, onEdit }: { log: LogRow; onEdit: () => void }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const parsed = useMemo(() => parseWorkoutContent(log.content), [log.content]);
  const exerciseCount = parsed.kind === 'exercises' ? parsed.exercises.length : 0;

  return (
    <Card style={{ gap: spacing.md, marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Pressable
          onPress={() => setOpen((value) => !value)}
          accessibilityRole="button"
          accessibilityLabel={`${log.title ?? 'Workout'}, ${format(parseLocalDate(log.date), 'd MMMM yyyy')}, ${exerciseCount} exercises`}
          accessibilityState={{ expanded: open }}
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            minHeight: 48,
            borderRadius: spacing.sm,
            backgroundColor: pressed ? colors.pressed : 'transparent',
          })}
        >
          <View style={{ alignItems: 'center', width: 48 }}>
            <Text variant="h2" numeric>{format(parseLocalDate(log.date), 'd')}</Text>
            <Text variant="label" tone="muted">{format(parseLocalDate(log.date), 'MMM')}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text>{log.title || 'Workout'}</Text>
            <Text variant="bodySm" tone="muted">{exerciseCount ? `${exerciseCount} exercises` : 'View details'}</Text>
          </View>
          <DisclosureChevron expanded={open} size={iconSize.md} color={colors.mutedForeground} />
        </Pressable>
        <Pressable
          onPress={onEdit}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${log.title ?? 'workout'}`}
          style={({ pressed }) => ({
            minWidth: 48,
            minHeight: 48,
            alignItems: 'flex-end',
            justifyContent: 'center',
            borderRadius: spacing.sm,
            backgroundColor: pressed ? colors.pressed : 'transparent',
          })}
        >
          <Text variant="bodySm" tone="primary">Edit</Text>
        </Pressable>
      </View>

      <MotionReveal revision={open ? 'open' : 'closed'}>
        {open ? (
          <View style={{ gap: spacing.md }}>
            {parsed.kind === 'text' ? (
              <Text variant="bodySm" tone="muted">{parsed.text}</Text>
            ) : parsed.exercises.map((exercise, index) => (
              <View
                key={`${exercise.name}-${index}`}
                style={{ gap: spacing.xs, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}
              >
                <Text>{exercise.name}</Text>
                {exercise.sets.length ? exercise.sets.map((set) => {
                  const label = loggedSetText(set, exercise.tracking);
                  return (
                    <Text
                      key={set.setNumber}
                      variant="bodySm"
                      tone="muted"
                      numeric
                      accessibilityLabel={label.accessibility}
                    >
                      {label.visible}
                    </Text>
                  );
                }) : exercise.legacy ? (
                  <Text variant="bodySm" tone="muted" numeric>
                    {[
                      exercise.legacy.sets && `${exercise.legacy.sets} sets`,
                      exercise.legacy.reps && `${exercise.legacy.reps} reps`,
                      exercise.legacy.weight && `${exercise.legacy.weight} kg`,
                      exercise.legacy.duration,
                      exercise.legacy.rest && `rest ${exercise.legacy.rest}`,
                    ].filter(Boolean).join(' · ')}
                  </Text>
                ) : (
                  <Text variant="bodySm" tone="muted">{exercise.raw}</Text>
                )}
              </View>
            ))}
          </View>
        ) : null}
      </MotionReveal>
    </Card>
  );
});

export function LocalWorkoutCard({ item, onOpen }: { item: OutboxItem; onOpen: () => void }) {
  const { colors } = useTheme();
  const blocked = item.failure?.retryable === false;
  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={{ gap: spacing.xs }}>
        <Text>{item.title || 'Workout'}</Text>
        <Text variant="bodySm" tone="muted">{format(parseLocalDate(item.date), 'd MMMM yyyy')}</Text>
        <StatusPill
          status={blocked ? 'error' : 'offline'}
          label={blocked ? 'Needs attention before syncing' : 'Waiting to sync'}
        />
      </View>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${blocked ? 'Review blocked workout' : 'Open saved workout'} ${item.title || 'Workout'} from ${item.date}`}
        style={({ pressed }) => ({
          minHeight: 48,
          justifyContent: 'center',
          borderRadius: spacing.sm,
          backgroundColor: pressed ? colors.pressed : 'transparent',
        })}
      >
        <Text variant="bodySm" tone="primary">{blocked ? 'Review and retry' : 'Open saved workout'}</Text>
      </Pressable>
    </Card>
  );
}

export function WorkoutHistory({ header }: { header?: ReactNode }) {
  const { colors } = useTheme();
  const listMotion = useListMotion();
  const listRef = useRef<FlatList<LogRow>>(null);
  const router = useRouter();
  const { user } = useAuth();
  const activeUserIdRef = useRef(user?.id);
  activeUserIdRef.current = user?.id;
  const queryClient = useQueryClient();
  const [localRecords, setLocalRecords] = useState<OutboxItem[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const localOwnerIdRef = useRef<string | undefined>(undefined);

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

  const refreshPending = useCallback(() => {
    const userId = user?.id;
    if (!userId) {
      localOwnerIdRef.current = undefined;
      setLocalRecords([]);
      setLocalError(null);
      return;
    }
    if (localOwnerIdRef.current !== userId) {
      localOwnerIdRef.current = userId;
      setLocalRecords([]);
      setLocalError(null);
    }
    void readOutbox(userId).then((items) => {
      if (activeUserIdRef.current === userId) {
        setLocalRecords(items);
        setLocalError(null);
      }
    }).catch(() => {
      if (activeUserIdRef.current === userId) setLocalError("Couldn't read workouts saved on this device.");
    });
  }, [user?.id]);

  useFocusEffect(refreshPending);
  useEffect(() => {
    refreshPending();
    const flushPending = () => {
      if (!user?.id) return;
      void flushOutbox(user.id).then((count) => {
        refreshPending();
        if (count > 0) void queryClient.invalidateQueries({ queryKey: ['workoutLogs'] });
      }).catch(refreshPending);
    };
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') flushPending();
    });
    const netSub = NetInfo.addEventListener((state) => {
      if (state.isConnected) flushPending();
    });
    return () => {
      appSub.remove();
      netSub();
    };
  }, [queryClient, refreshPending, user?.id]);

  const metrics = useMemo(() => {
    const all = logs ?? [];
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    return {
      total: all.length,
      thisWeek: all.filter((log) => parseLocalDate(log.date) >= weekStart).length,
    };
  }, [logs]);
  const visibleRecords = localOwnerIdRef.current === user?.id ? localRecords : [];
  const visibleError = localOwnerIdRef.current === user?.id ? localError : null;
  const queuedCount = visibleRecords.filter((item) => item.failure?.retryable !== false).length;
  const blockedCount = visibleRecords.length - queuedCount;

  const openLocalRecord = (item: OutboxItem) => router.push({
    pathname: '/(app)/logger',
    params: { date: item.date, logId: item.existingLogId ?? '', outboxId: item.id },
  });

  const listHeader = (
    <View style={{ gap: spacing.base, marginBottom: spacing.base }}>
      {header}
      <Text variant="h2">Workout history</Text>

      {visibleRecords.length > 0 ? (
        <Animated.View
          entering={listMotion.enabled ? FadeInDown.duration(240) : undefined}
          exiting={listMotion.enabled ? FadeOutUp.duration(200) : undefined}
          layout={listMotion.enabled ? LinearTransition.duration(240) : undefined}
        >
          <StatusPill
            status={blockedCount > 0 ? 'error' : 'offline'}
            label={[
              queuedCount > 0 ? `${queuedCount} waiting to sync` : null,
              blockedCount > 0 ? `${blockedCount} need attention` : null,
            ].filter(Boolean).join(' · ')}
          />
        </Animated.View>
      ) : null}

      {visibleError ? (
        <Card style={{ gap: spacing.sm }}>
          <Text variant="bodySm" tone="destructive">{visibleError}</Text>
          <Button label="Reload saved workouts" variant="secondary" onPress={refreshPending} />
        </Card>
      ) : null}

      {visibleRecords.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="h2">Saved on this device</Text>
          {visibleRecords.map((item) => (
            <LocalWorkoutCard key={item.id} item={item} onOpen={() => openLocalRecord(item)} />
          ))}
        </View>
      ) : null}

      {!isLoading && !isError ? (
        <AdaptiveGrid>
          <MetricCard icon={Dumbbell} label="All workouts" value={String(metrics.total)} trend={{ value: 0, goodDirection: 'up', caption: 'logged' }} />
          <MetricCard icon={CalendarDays} label="This week" value={String(metrics.thisWeek)} trend={{ value: 0, goodDirection: 'up', caption: 'workouts' }} />
        </AdaptiveGrid>
      ) : null}

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
        data={isError || isLoading ? [] : logs ?? []}
        keyExtractor={(log) => log.id}
        ListHeaderComponent={listHeader}
        renderItem={({ item }) => (
          <LogCard
            log={item}
            onEdit={() => router.push({ pathname: '/(app)/logger', params: { date: item.date, logId: item.id } })}
          />
        )}
        ListEmptyComponent={
          isLoading ? <SkeletonCard lines={3} /> : isError ? <ErrorState onRetry={refetch} /> : (
            <EmptyState
              icon={null}
              title="No workouts logged yet"
              message="Log your first session and you'll start seeing previous-session numbers to beat."
              actionLabel="Log a workout"
              onAction={() => router.push({ pathname: '/(app)/logger', params: { date: localDateString() } })}
            />
          )
        }
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        windowSize={7}
        itemLayoutAnimation={listMotion.itemLayoutAnimation}
      />
    </Screen>
  );
}
