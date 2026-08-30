import NetInfo from '@react-native-community/netinfo';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
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

import { ExerciseSlide } from '@/components/logger/ExerciseSlide';
import { SwipeableSlide } from '@/components/logger/SwipeableSlide';
import { RestTimer } from '@/components/logger/RestTimer';
import {
  type WorkoutResult,
  WorkoutSummary,
} from '@/components/logger/WorkoutSummary';
import { Button, Card, Input, Screen, StatusPill, StickyActionBar, Text } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import {
  initialWorkoutState,
  workoutReducer,
  type WorkoutAction,
  type WorkoutExercise,
} from '@/features/workout/workoutReducer';
import {
  acquireWorkoutSave,
  applyWorkoutEdit,
  attachPersistedWorkoutId,
  finalizeWorkoutSave,
  releaseWorkoutSave,
  type WorkoutEditAction,
} from '@/features/workout/workoutSave';
import { useWorkoutPlan } from '@/hooks/usePlans';
import { useWorkoutDraft } from '@/hooks/useWorkoutDraft';
import { localDateString, parseLocalDate } from '@/lib/dates';
import { flushOutbox, saveWorkoutLog } from '@/lib/outbox';
import { supabase } from '@/lib/supabase';
import {
  countSets,
  maxWeightFor,
  parseWorkoutContent,
  serializeWorkoutContent,
  totalVolume,
} from '@/lib/workout-content';
import { HIT_SLOP_MIN, iconSize, spacing, useTheme } from '@/theme';

function elapsedLabel(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function LoggerScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ date?: string; day?: string; logId?: string }>();

  const date = params.date && params.date <= localDateString() ? params.date : localDateString();
  const [state, reducerDispatch] = useReducer(workoutReducer, initialWorkoutState);
  const editSnapshotRef = useRef({ generation: 0, state });
  editSnapshotRef.current.state = state;
  const savingRef = useRef(false);
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [summary, setSummary] = useState<null | {
    result: WorkoutResult;
    syncStatus: 'saved' | 'offline';
  }>(null);
  const [newExercise, setNewExercise] = useState('');
  const openedAt = useRef(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const dispatchEdit = useCallback((action: WorkoutEditAction) => {
    editSnapshotRef.current = applyWorkoutEdit(editSnapshotRef.current, action);
    reducerDispatch(action);
  }, []);

  const dispatchWithoutEdit = useCallback((action: WorkoutAction) => {
    editSnapshotRef.current = {
      ...editSnapshotRef.current,
      state: workoutReducer(editSnapshotRef.current.state, action),
    };
    reducerDispatch(action);
  }, []);

  const markNonReducerEdit = useCallback(() => {
    editSnapshotRef.current = {
      ...editSnapshotRef.current,
      generation: editSnapshotRef.current.generation + 1,
    };
  }, []);

  const attachPersistedId = useCallback((logId: string) => {
    editSnapshotRef.current = attachPersistedWorkoutId(editSnapshotRef.current, logId);
    reducerDispatch({ type: 'ATTACH_PERSISTED_LOG_ID', payload: logId });
  }, []);

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

  useEffect(() => {
    const updateElapsed = () =>
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - openedAt.current) / 1000)));
    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, []);

  // Seed order: draft → existing log → plan day → empty.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || existingLog === undefined) return;
    seeded.current = true;

    void (async () => {
      const draft = await loadDraft();
      if (draft) {
        const selectedDay = Number(draft.selectedPlanId);
        dispatchWithoutEdit({
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
        dispatchWithoutEdit({
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
    (dayNumber: number, userInitiated = false) => {
      const day = plan?.days.find((d) => d.day_number === dayNumber);
      if (!day) return;
      const action: WorkoutEditAction = {
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
      };
      if (userInitiated) dispatchEdit(action);
      else dispatchWithoutEdit(action);
      setIndex(0);
    },
    [dispatchEdit, dispatchWithoutEdit, plan],
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
        }).catch(() => {});
      }
    });
    return unsub;
  }, [queryClient]);

  const currentPlanDay = plan?.days.find((d) => d.day_number === state.selectedDay);
  const currentExercise = state.exercises[index];
  const currentExerciseName = currentExercise?.name;
  const planMeta = currentPlanDay?.exercises.find(
    (e) => e.name.toLowerCase() === currentExercise?.name.toLowerCase(),
  );

  const completedCount = state.exercises.filter((ex) =>
    ex.sets.some((s) => s.completed),
  ).length;

  useEffect(() => {
    if (!currentExerciseName) return;
    AccessibilityInfo.announceForAccessibility(
      `Exercise ${index + 1} of ${state.exercises.length}: ${currentExerciseName}`,
    );
  }, [currentExerciseName, index, state.exercises.length]);

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
    if (!acquireWorkoutSave(savingRef)) return;

    const submittedSnapshot = editSnapshotRef.current;
    const submittedState = submittedSnapshot.state;
    if (!submittedState.title.trim()) {
      releaseWorkoutSave(savingRef);
      setSaveError('Give this workout a title first.');
      return;
    }
    setSaving(true);
    setSaveError(null);

    const content = serializeWorkoutContent({
      planDayNumber: submittedState.selectedDay,
      exercises: submittedState.exercises.map((ex) => ({
        name: ex.name,
        sets: ex.sets.map((s, i) => ({
          setNumber: i + 1,
          reps: s.reps,
          weight: s.weight,
          rpe: s.rpe,
          completed: s.completed,
          duration: s.duration,
          kind: s.kind,
        })),
      })),
    });
    const payload = { user_id: user.id, date, title: submittedState.title.trim(), content };

    // PR detection against the previous-session data.
    const prs: string[] = [];
    for (const ex of submittedState.exercises) {
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
      sets: countSets(exercisesNow),
      minutes: Math.max(1, Math.round((Date.now() - openedAt.current) / 60000)),
      prs,
    };

    let syncStatus: 'saved' | 'offline' = 'saved';
    try {
      try {
        const saveResult = await saveWorkoutLog({
          ...payload,
          existingLogId: submittedState.existingLogId,
        });
        if (saveResult.status === 'synced') {
          attachPersistedId(saveResult.logId);
          void queryClient.invalidateQueries({ queryKey: ['workoutLogs'] });
        } else {
          syncStatus = 'offline';
        }
      } catch {
        setSaveError('Couldn’t save or queue this workout. Your draft is still here — try again.');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      const finalization = await finalizeWorkoutSave({
        savedGeneration: submittedSnapshot.generation,
        getCurrentGeneration: () => editSnapshotRef.current.generation,
        clearDraft,
        repersistLatestDraft: () => {
          const latest = editSnapshotRef.current.state;
          return saveDraftNow({
            workoutTitle: latest.title,
            exercises: latest.exercises,
            selectedPlanId: String(latest.selectedDay ?? 'custom'),
            existingLogId: latest.existingLogId,
          });
        },
      });
      if (finalization === 'edited') {
        const submittedStatus =
          syncStatus === 'saved'
            ? 'The submitted version was saved and synced.'
            : 'The submitted version was saved here and is waiting to sync.';
        setSaveError(`${submittedStatus} Newer edits are still open — save again when ready.`);
        AccessibilityInfo.announceForAccessibility(
          `${submittedStatus} Newer edits remain in the workout editor.`,
        );
        return;
      }

      dispatchWithoutEdit({ type: 'MARK_CLEAN' });
      void Haptics.notificationAsync(
        syncStatus === 'saved'
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );
      if (prs.length) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setTimeout(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 90);
      }
      AccessibilityInfo.announceForAccessibility(
        `${syncStatus === 'saved' ? 'Workout saved and synced.' : 'Workout saved here, waiting to sync.'} ${result.volume} kilograms total volume.${prs.length ? ` New personal record on ${prs.join(', ')}.` : ''}`,
      );
      setSummary({ result, syncStatus });
    } finally {
      releaseWorkoutSave(savingRef);
      setSaving(false);
    }
  };

  // ── post-workout summary ────────────────────────────────────────────────
  if (summary) {
    return (
      <Screen>
        <WorkoutSummary
          result={summary.result}
          syncStatus={summary.syncStatus}
          onDone={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen archetype="editor">
        <View style={{ gap: spacing.base }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
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
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text variant="h2">{format(parseLocalDate(date), 'EEE d MMM')}</Text>
              <Text variant="bodySm" tone="muted" numeric>
                {elapsedLabel(elapsedSeconds)} elapsed ·{' '}
                {state.exercises.length
                  ? `Exercise ${index + 1} of ${state.exercises.length}`
                  : 'No exercises'}
              </Text>
              {state.isDirty ? (
                <StatusPill
                  status={draftStatus}
                  label={draftStatus === 'idle' ? 'Draft has changes' : undefined}
                />
              ) : null}
            </View>
            <Pressable
              onPress={() => void save()}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel={state.existingLogId ? 'Save workout changes' : 'Finish workout'}
              accessibilityState={{ disabled: saving, busy: saving }}
              style={{ minWidth: HIT_SLOP_MIN, minHeight: HIT_SLOP_MIN, justifyContent: 'center' }}
            >
              <Text variant="bodySm" tone="primary">
                {state.existingLogId ? 'Save' : 'Finish'}
              </Text>
            </Pressable>
          </View>

          <Input
            label="Workout title"
            value={state.title}
            onChangeText={(t) => dispatchEdit({ type: 'SET_TITLE', payload: t })}
            placeholder="e.g. Push Day"
          />

          {plan?.days.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              {plan.days.map((d) => {
                const active = d.day_number === state.selectedDay;
                return (
                  <Pressable
                    key={d.id}
                    onPress={() => loadDay(d.day_number, true)}
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
                    const done = ex.sets.some((s) => s.completed);
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
                    dispatchEdit({
                      type: 'UPDATE_SET',
                      payload: { exerciseIndex: index, setIndex: setIdx, field, value },
                    })
                  }
                  onToggleSet={(setIdx) =>
                    dispatchEdit({
                      type: 'TOGGLE_SET',
                      payload: { exerciseIndex: index, setIndex: setIdx },
                    })
                  }
                  onAddSet={() =>
                    dispatchEdit({ type: 'ADD_SET', payload: { exerciseIndex: index } })
                  }
                  onRemoveSet={(setIdx) =>
                    dispatchEdit({
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
              onChangeText={(value) => {
                markNonReducerEdit();
                setNewExercise(value);
              }}
              placeholder="e.g. Cable Fly"
              returnKeyType="done"
              onSubmitEditing={() => {
                if (!newExercise.trim()) return;
                dispatchEdit({ type: 'ADD_EXERCISE', payload: { name: newExercise.trim() } });
                setNewExercise('');
                setIndex(state.exercises.length);
              }}
            />
            <Button
              label="Add"
              variant="secondary"
              onPress={() => {
                if (!newExercise.trim()) return;
                dispatchEdit({ type: 'ADD_EXERCISE', payload: { name: newExercise.trim() } });
                setNewExercise('');
                setIndex(state.exercises.length);
              }}
            />
          </Card>

        </View>
      </Screen>

      <StickyActionBar
        status={saveError ?? undefined}
        primaryLabel={state.existingLogId ? 'Save workout' : 'Finish and save'}
        onPrimary={() => void save()}
        primaryLoading={saving}
      />
    </KeyboardAvoidingView>
  );
}
