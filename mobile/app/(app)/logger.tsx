import NetInfo from '@react-native-community/netinfo';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Trophy, X } from 'lucide-react-native';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseSlide } from '@/components/logger/ExerciseSlide';
import { SwipeableSlide } from '@/components/logger/SwipeableSlide';
import { RestTimer } from '@/components/logger/RestTimer';
import { Button, Card, Input, Screen, Text } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import {
  initialWorkoutState,
  workoutReducer,
  type WorkoutExercise,
} from '@/features/workout/workoutReducer';
import { useWorkoutPlan } from '@/hooks/usePlans';
import { useWorkoutDraft } from '@/hooks/useWorkoutDraft';
import { localDateString, parseLocalDate } from '@/lib/dates';
import { enqueue, flushOutbox } from '@/lib/outbox';
import { supabase } from '@/lib/supabase';
import { maxWeightFor, parseWorkoutContent, totalVolume } from '@/lib/workout-content';
import { HIT_SLOP_MIN, iconSize, spacing, useTheme } from '@/theme';

export default function LoggerScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ date?: string; day?: string; logId?: string }>();

  const date = params.date && params.date <= localDateString() ? params.date : localDateString();
  const [state, dispatch] = useReducer(workoutReducer, initialWorkoutState);
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [summary, setSummary] = useState<null | {
    volume: number;
    sets: number;
    minutes: number;
    prs: string[];
  }>(null);
  const [newExercise, setNewExercise] = useState('');
  const openedAt = useRef(Date.now());

  const { saveDraft, saveDraftNow, loadDraft, clearDraft, draftStatus } = useWorkoutDraft(
    user?.id,
    date,
  );
  // Day picker uses ONLY the user's own plan rows (no template fallback).
  const { data: plan } = useWorkoutPlan({ userRowsOnly: true });

  const { data: existingLog } = useQuery({
    queryKey: ['workoutLog', user?.id, date],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: previousData } = useQuery({
    queryKey: ['previousWorkoutData', user?.id, date],
    queryFn: async () => {
      if (!user?.id) return {};
      const { data } = await supabase
        .from('workout_logs')
        .select('content')
        .eq('user_id', user.id)
        .lt('date', date)
        .order('date', { ascending: false })
        .limit(10);
      const result: Record<string, { weight: string; reps: string; rpe: string }[]> = {};
      for (const log of data ?? []) {
        const parsed = parseWorkoutContent(log.content);
        if (parsed.kind !== 'exercises') continue;
        for (const ex of parsed.exercises) {
          const key = ex.name.toLowerCase().trim();
          // First occurrence wins — logs are newest-first.
          if (!key || result[key]) continue;
          result[key] = ex.sets.map((s) => ({ weight: s.weight, reps: s.reps, rpe: s.rpe }));
        }
      }
      return result;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Seed order: draft → existing log → plan day → empty.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || existingLog === undefined) return;
    seeded.current = true;

    void (async () => {
      const draft = await loadDraft();
      if (draft) {
        const selectedDay = Number(draft.selectedPlanId);
        dispatch({
          type: 'RESTORE_DRAFT',
          payload: {
            title: draft.workoutTitle,
            exercises: draft.exercises,
            existingLogId: draft.existingLogId,
            selectedDay: Number.isInteger(selectedDay) ? selectedDay : null,
          },
        });
        AccessibilityInfo.announceForAccessibility('Draft restored.');
        return;
      }
      if (existingLog) {
        const parsed = parseWorkoutContent(existingLog.content);
        const exercises: WorkoutExercise[] =
          parsed.kind === 'exercises'
            ? parsed.exercises.map((e, i) => ({
                id: String(i),
                name: e.name,
                tracking: 'weight-reps',
                sets: e.sets.length
                  ? e.sets.map((s, setIndex) => ({
                      id: `${i}-set-${setIndex + 1}`,
                      reps: s.reps,
                      weight: s.weight,
                      rpe: s.rpe,
                      duration: s.duration ?? '',
                      kind: s.kind ?? 'work',
                      completed: s.completed,
                    }))
                  : [
                      {
                        id: `${i}-set-1`,
                        reps: '',
                        weight: '',
                        rpe: '',
                        duration: '',
                        kind: 'work',
                        completed: false,
                      },
                    ],
              }))
            : [];
        dispatch({
          type: 'LOAD_EXISTING_LOG',
          payload: {
            logId: existingLog.id,
            title: existingLog.title ?? '',
            exercises,
            selectedDay: parsed.kind === 'exercises' ? parsed.planDayNumber ?? null : null,
          },
        });
        return;
      }
      const dayNumber = params.day ? Number(params.day) : plan?.days[0]?.day_number;
      const day = plan?.days.find((d) => d.day_number === dayNumber) ?? plan?.days[0];
      if (day) loadDay(day.day_number);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingLog, plan]);

  const loadDay = useCallback(
    (dayNumber: number) => {
      const day = plan?.days.find((d) => d.day_number === dayNumber);
      if (!day) return;
      dispatch({
        type: 'LOAD_DEFAULT_PLAN',
        payload: {
          day: dayNumber,
          title: day.focus ? `Day ${dayNumber} — ${day.focus}` : `Day ${dayNumber}`,
          exercises: day.exercises.map((ex, i) => ({
            id: ex.id ?? String(i),
            name: ex.name,
            sets: Array.from({ length: Math.max(1, ex.sets) }, () => ({
              reps: '',
              weight: '',
              rpe: '',
            })),
          })),
        },
      });
      setIndex(0);
    },
    [plan],
  );

  // Debounced draft autosave.
  useEffect(() => {
    if (!state.isDirty || !state.exercises.length) return;
    saveDraft({
      workoutTitle: state.title,
      exercises: state.exercises,
      selectedPlanId: String(state.selectedDay ?? 'custom'),
      existingLogId: state.existingLogId,
    });
  }, [state, saveDraft]);

  // Flush the outbox when connectivity returns.
  useEffect(() => {
    const unsub = NetInfo.addEventListener((s) => {
      if (s.isConnected) {
        void flushOutbox().then((n) => {
          if (n > 0) void queryClient.invalidateQueries({ queryKey: ['workoutLogs'] });
        });
      }
    });
    return unsub;
  }, [queryClient]);

  const currentPlanDay = plan?.days.find((d) => d.day_number === state.selectedDay);
  const currentExercise = state.exercises[index];
  const planMeta = currentPlanDay?.exercises.find(
    (e) => e.name.toLowerCase() === currentExercise?.name.toLowerCase(),
  );

  const completedCount = state.exercises.filter((ex) =>
    ex.sets.some((s) => s.weight.trim() && s.reps.trim()),
  ).length;

  const close = () => {
    if (!state.isDirty) {
      router.back();
      return;
    }
    Alert.alert('Leave this workout?', 'Save a draft to continue from this point later.', [
      { text: 'Keep editing', style: 'cancel' },
      {
        text: 'Discard draft',
        style: 'destructive',
        onPress: () => {
          void clearDraft();
          router.back();
        },
      },
      {
        text: 'Save draft & exit',
        onPress: () => {
          void saveDraftNow({
            workoutTitle: state.title,
            exercises: state.exercises,
            selectedPlanId: String(state.selectedDay ?? 'custom'),
            existingLogId: state.existingLogId,
          }).then(() => router.back());
        },
      },
    ]);
  };

  const save = async () => {
    if (!user?.id) return;
    if (!state.title.trim()) {
      setSaveError('Give this workout a title first.');
      return;
    }
    setSaving(true);
    setSaveError(null);

    const content = JSON.stringify(
      state.exercises.map((ex) => ({
        exercise: ex.name,
        sets: ex.sets.map((s, i) => ({
          setNumber: i + 1,
          reps: s.reps,
          weight: s.weight,
          rpe: s.rpe,
        })),
      })),
    );
    const payload = { user_id: user.id, date, title: state.title.trim(), content };

    // PR detection against the previous-session data.
    const prs: string[] = [];
    for (const ex of state.exercises) {
      const prev = previousData?.[ex.name.toLowerCase().trim()];
      if (!prev?.length) continue;
      const todayMax = maxWeightFor(ex.sets.map((s, i) => ({ setNumber: i + 1, ...s })));
      const prevMax = maxWeightFor(prev.map((s, i) => ({ setNumber: i + 1, ...s })));
      if (todayMax > 0 && todayMax > prevMax) prs.push(ex.name);
    }

    const parsedNow = parseWorkoutContent(content);
    const exercisesNow = parsedNow.kind === 'exercises' ? parsedNow.exercises : [];
    const result = {
      volume: totalVolume(exercisesNow),
      sets: exercisesNow.reduce(
        (n, e) => n + e.sets.filter((s) => s.weight.trim() && s.reps.trim()).length,
        0,
      ),
      minutes: Math.max(1, Math.round((Date.now() - openedAt.current) / 60000)),
      prs,
    };

    try {
      if (state.existingLogId) {
        const { error } = await supabase
          .from('workout_logs')
          .update(payload)
          .eq('id', state.existingLogId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('workout_logs').insert(payload);
        if (error) throw error;
      }
      await clearDraft();
      dispatch({ type: 'MARK_CLEAN' });
      void queryClient.invalidateQueries({ queryKey: ['workoutLogs'] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (prs.length) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setTimeout(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 90);
      }
      AccessibilityInfo.announceForAccessibility(
        `Workout saved. ${result.volume} kilograms total volume.${prs.length ? ` New personal record on ${prs.join(', ')}.` : ''}`,
      );
      setSummary(result);
    } catch {
      // Network failure → queue it, tell the user plainly.
      await enqueue({
        user_id: user.id,
        date,
        title: payload.title,
        content,
        existingLogId: state.existingLogId,
      });
      await clearDraft();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setSummary({ ...result, prs });
      setSaveError('Saved on this device — it will sync when you’re back online.');
    } finally {
      setSaving(false);
    }
  };

  // ── post-workout summary ────────────────────────────────────────────────
  if (summary) {
    return (
      <Screen>
        <View style={{ gap: spacing.lg, paddingTop: spacing.xl }}>
          <Text variant="h1">Workout saved</Text>
          {saveError ? (
            <Card>
              <Text variant="bodySm" tone="gold">
                {saveError}
              </Text>
            </Card>
          ) : null}
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Card style={{ flex: 1, gap: spacing.xs }}>
              <Text variant="label" tone="muted">
                Volume
              </Text>
              <Text variant="metric" numeric>
                {summary.volume.toLocaleString()}
              </Text>
              <Text variant="bodySm" tone="muted">
                kg total
              </Text>
            </Card>
            <Card style={{ flex: 1, gap: spacing.xs }}>
              <Text variant="label" tone="muted">
                Sets
              </Text>
              <Text variant="metric" numeric>
                {summary.sets}
              </Text>
              <Text variant="bodySm" tone="muted">
                completed
              </Text>
            </Card>
          </View>
          <Card style={{ gap: spacing.xs }}>
            <Text variant="label" tone="muted">
              Duration
            </Text>
            <Text variant="h2" numeric>
              {summary.minutes} min
            </Text>
          </Card>

          {summary.prs.length ? (
            <Card style={{ gap: spacing.sm, borderColor: colors.gold, borderWidth: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Trophy size={iconSize.lg} color={colors.gold} strokeWidth={2} accessible={false} />
                <Text variant="h2">New PR</Text>
              </View>
              {summary.prs.map((p) => (
                <Text key={p} variant="bodySm">
                  {p} — heaviest set yet
                </Text>
              ))}
            </Card>
          ) : null}

          <Button label="Done" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen archetype="editor">
        <View style={{ gap: spacing.base }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            {/* Explicit close: the stack's back-swipe is disabled on this route. */}
            <Pressable
              onPress={close}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close workout logger"
              style={{ minWidth: HIT_SLOP_MIN, minHeight: HIT_SLOP_MIN, justifyContent: 'center' }}
            >
              <X size={iconSize.lg} color={colors.foreground} strokeWidth={2} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text variant="h2">{format(parseLocalDate(date), 'EEE d MMM')}</Text>
              {state.isDirty ? (
                <Text
                  variant="bodySm"
                  tone={draftStatus === 'saved' ? 'success' : draftStatus === 'error' ? 'gold' : 'muted'}
                  accessibilityLiveRegion="polite"
                >
                  {draftStatus === 'saving'
                    ? 'Saving locally…'
                    : draftStatus === 'saved'
                      ? 'Saved locally'
                      : draftStatus === 'error'
                        ? 'Could not save draft'
                        : 'Draft restored'}
                </Text>
              ) : null}
            </View>
          </View>

          <Input
            label="Workout title"
            value={state.title}
            onChangeText={(t) => dispatch({ type: 'SET_TITLE', payload: t })}
            placeholder="e.g. Push Day"
          />

          {plan?.days.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              {plan.days.map((d) => {
                const active = d.day_number === state.selectedDay;
                return (
                  <Pressable
                    key={d.id}
                    onPress={() => loadDay(d.day_number)}
                    accessibilityRole="tab"
                    accessibilityLabel={`Day ${d.day_number}${d.focus ? `, ${d.focus}` : ''}`}
                    accessibilityState={{ selected: active }}
                    style={{
                      minHeight: 40,
                      justifyContent: 'center',
                      paddingHorizontal: spacing.base,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: active ? colors.primary : colors.borderStrong,
                      backgroundColor: active ? colors.primaryFill : 'transparent',
                    }}
                  >
                    <Text variant="bodySm" tone={active ? 'onPrimary' : 'muted'}>
                      Day {d.day_number}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          {state.exercises.length ? (
            <>
              <Text variant="bodySm" tone="muted" numeric>
                {completedCount} of {state.exercises.length} exercises
              </Text>

              {/* Visible prev/next — swipe is never the only way (§03.B.2). */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Pressable
                  onPress={() => setIndex((i) => Math.max(0, i - 1))}
                  disabled={index === 0}
                  accessibilityRole="button"
                  accessibilityLabel="Previous exercise"
                  accessibilityState={{ disabled: index === 0 }}
                  style={{ minWidth: HIT_SLOP_MIN, minHeight: HIT_SLOP_MIN, alignItems: 'center', justifyContent: 'center', opacity: index === 0 ? 0.3 : 1 }}
                >
                  <ChevronLeft size={iconSize.lg} color={colors.foreground} strokeWidth={2} />
                </Pressable>

                <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }}>
                  {state.exercises.map((ex, i) => {
                    const done = ex.sets.some((s) => s.weight.trim() && s.reps.trim());
                    return (
                      <View
                        key={ex.id}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: done
                            ? colors.success
                            : i === index
                              ? colors.primary
                              : colors.borderStrong,
                        }}
                      />
                    );
                  })}
                </View>

                <Pressable
                  onPress={() => setIndex((i) => Math.min(state.exercises.length - 1, i + 1))}
                  disabled={index >= state.exercises.length - 1}
                  accessibilityRole="button"
                  accessibilityLabel="Next exercise"
                  accessibilityState={{ disabled: index >= state.exercises.length - 1 }}
                  style={{ minWidth: HIT_SLOP_MIN, minHeight: HIT_SLOP_MIN, alignItems: 'center', justifyContent: 'center', opacity: index >= state.exercises.length - 1 ? 0.3 : 1 }}
                >
                  <ChevronRight size={iconSize.lg} color={colors.foreground} strokeWidth={2} />
                </Pressable>
              </View>

              {currentExercise ? (
                <SwipeableSlide
                  canPrev={index > 0}
                  canNext={index < state.exercises.length - 1}
                  onPrev={() => setIndex((i) => Math.max(0, i - 1))}
                  onNext={() => setIndex((i) => Math.min(state.exercises.length - 1, i + 1))}
                >
                <ExerciseSlide
                  exercise={currentExercise}
                  targetReps={planMeta?.reps}
                  videoLink={planMeta?.videoLink}
                  notes={planMeta?.notes}
                  previous={previousData?.[currentExercise.name.toLowerCase().trim()]}
                  onUpdateSet={(setIdx, field, value) =>
                    dispatch({
                      type: 'UPDATE_SET',
                      payload: { exerciseIndex: index, setIndex: setIdx, field, value },
                    })
                  }
                  onAddSet={() =>
                    dispatch({ type: 'ADD_SET', payload: { exerciseIndex: index } })
                  }
                  onRemoveSet={(setIdx) =>
                    dispatch({
                      type: 'REMOVE_SET',
                      payload: { exerciseIndex: index, setIndex: setIdx },
                    })
                  }
                />
                </SwipeableSlide>
              ) : null}

              <RestTimer contextLabel={currentExercise?.name} />
            </>
          ) : (
            <Card style={{ gap: spacing.sm }}>
              <Text variant="bodySm" tone="muted">
                No plan day loaded. Add exercises manually to log a free-form session.
              </Text>
            </Card>
          )}

          <Card style={{ gap: spacing.sm }}>
            <Input
              label="Add an exercise"
              value={newExercise}
              onChangeText={setNewExercise}
              placeholder="e.g. Cable Fly"
              returnKeyType="done"
              onSubmitEditing={() => {
                if (!newExercise.trim()) return;
                dispatch({ type: 'ADD_EXERCISE', payload: { name: newExercise.trim() } });
                setNewExercise('');
                setIndex(state.exercises.length);
              }}
            />
            <Button
              label="Add"
              variant="secondary"
              onPress={() => {
                if (!newExercise.trim()) return;
                dispatch({ type: 'ADD_EXERCISE', payload: { name: newExercise.trim() } });
                setNewExercise('');
                setIndex(state.exercises.length);
              }}
            />
          </Card>

          {saveError ? (
            <Text variant="bodySm" tone="primary" accessibilityLiveRegion="polite">
              {saveError}
            </Text>
          ) : null}
        </View>
      </Screen>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: spacing.base,
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom + spacing.sm,
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Button
          label={state.existingLogId ? 'Update workout' : 'Save workout'}
          onPress={save}
          loading={saving}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
