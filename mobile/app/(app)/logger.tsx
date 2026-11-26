import NetInfo from '@react-native-community/netinfo';
import { usePreventRemove, type NavigationAction } from 'expo-router/react-navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { ExerciseSlide } from '@/components/logger/ExerciseSlide';
import { PlanDayButton } from '@/components/logger/PlanDayButton';
import { RestDock, useRestPreference, WorkoutRestFooter } from '@/components/logger/RestDock';
import { useRestTimerActions } from '@/components/logger/useRestTimer';
import { SwipeableSlide } from '@/components/logger/SwipeableSlide';
import { WorkoutOverviewSheet } from '@/components/logger/WorkoutOverviewSheet';
import { WorkoutRecovery } from '@/components/logger/WorkoutRecovery';
import { WorkoutSummary } from '@/components/logger/WorkoutSummary';
import { Button, Card, Input, RecordStatus, Screen, SkeletonCard, Text } from '@/components/ui';
import { DisclosureChevron } from '@/components/ui/DisclosureChevron';
import { MotionReveal } from '@/components/ui/MotionReveal';
import { useAuth } from '@/contexts/AuthContext';
import { createDraftExerciseFromPlan } from '@/features/workout/workoutReducer';
import { buildExerciseHistory, collectPlanExerciseNames, normalizeExerciseName, type SetSuggestionValues } from '@/features/workout/workoutSuggestions';
import { useWorkoutSession } from '@/features/workout/useWorkoutSession';
import { reviewWorkout } from '@/features/workout/workout-review';
import { useWorkoutActivity } from '@/features/native-surfaces/hooks';
import { workoutIsLive } from '@/features/native-surfaces/model';
import type { PlanExercise } from '@/hooks/usePlans';
import { isDateKeyStrict, localDateString, parseLocalDate } from '@/lib/dates';
import { flushOutbox } from '@/lib/outbox';
import { supabase } from '@/lib/supabase';
import { HIT_SLOP_MIN, iconSize, radius, spacing, useTheme } from '@/theme';

function findPrescription(exercises: PlanExercise[], name: string): PlanExercise | undefined {
  for (const exercise of exercises) {
    if (normalizeExerciseName(exercise.name) === normalizeExerciseName(name)) return exercise;
    const match = findPrescription(exercise.substitutions, name); if (match) return match;
  }
}

const unfinished = (exercise: { sets: { completed: boolean }[] }) =>
  exercise.sets.length === 0 || exercise.sets.some((set) => !set.completed);

function findNextUnfinishedExerciseIndex(exercises: { sets: { completed: boolean }[] }[], currentIndex: number) {
  for (let index = currentIndex + 1; index < exercises.length; index += 1) {
    if (unfinished(exercises[index])) return index;
  }
  for (let index = 0; index < currentIndex; index += 1) {
    if (unfinished(exercises[index])) return index;
  }
  return -1;
}

export default function LoggerScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string; day?: string; logId?: string; outboxId?: string }>();
  const frozenToday = useRef(localDateString()).current;
  const date = params.date ?? frozenToday;
  if (typeof date !== 'string' || !isDateKeyStrict(date) || date > localDateString()) {
    return <Screen><Text variant="h1">This workout date is unavailable</Text><Text variant="bodySm" tone="muted">Open a workout for today or a previous reporting date.</Text><Button label="Back to history" onPress={() => router.replace('/(app)/logs')} /></Screen>;
  }
  if (!user?.id) return <Screen><Text>Sign in to open your workout.</Text></Screen>;
  const logId = typeof params.logId === 'string' && params.logId ? params.logId : null;
  const outboxId = typeof params.outboxId === 'string' && params.outboxId ? params.outboxId : undefined;
  return <WorkoutEditor key={`${user.id}:${date}:${logId ?? ''}:${outboxId ?? ''}`} userId={user.id} date={date} logId={logId} outboxId={outboxId} initialDay={Number(params.day) || undefined} />;
}

function WorkoutEditor({ userId, date, logId, outboxId, initialDay }: { userId: string; date: string; logId: string | null; outboxId?: string; initialDay?: number }) {
  const { colors } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const session = useWorkoutSession({ userId, date, logId }, { initialDay, outboxId });
  const { state, edit } = session;
  const restActions = useRestTimerActions();
  const rest = useRestPreference(userId);
  const [index, setIndex] = useState(0);
  const activity = useWorkoutActivity({ userId, date, exerciseIndex: index, exercises: state.exercises, eligible: workoutIsLive({ date, today: localDateString(), ready: session.entry.kind === 'ready' && !session.recovery, existingLogId: state.existingLogId, outboxId, delivery: session.deliveryState, source: session.entry.kind === 'ready' ? session.entry.source : null }) });
  const [newExercise, setNewExercise] = useState('');
  const [overview, setOverview] = useState(false);
  const [sessionDetails, setSessionDetails] = useState(false);
  const [review, setReview] = useState(false);
  const [submittedReview, setSubmittedReview] = useState(false);
  const [receiptRevision, setReceiptRevision] = useState(0);
  const [result, setResult] = useState(() => reviewWorkout(state));
  const [footerHeight, setFooterHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [allowExit, setAllowExit] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const pendingNavigation = useRef<NavigationAction | null>(null);
  const showingExit = useRef(false);
  const overviewTrigger = useRef<View>(null);
  const { width, height, fontScale } = useWindowDimensions();
  const compactHeader = width < 360 || fontScale > 1.3;
  const inlineFooter = keyboardVisible || height < 650 || fontScale > 1.3;
  const { data: previous } = useQuery({
    queryKey: ['previousWorkoutData', userId, date],
    queryFn: async () => {
      const { data, error } = await supabase.from('workout_logs').select('date, content').eq('user_id', userId).lt('date', date).order('date', { ascending: false }).limit(10);
      if (error) throw error;
      return buildExerciseHistory(data ?? []);
    }, retry: false,
  });

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  useEffect(() => {
    let active = true;
    const unsubscribe = NetInfo.addEventListener((connection) => {
      if (!connection.isConnected) return;
      void flushOutbox(userId).then((count) => {
        if (active && count > 0) void queryClient.invalidateQueries({ queryKey: ['workoutLogs'] });
      }).catch(() => {});
    });
    return () => { active = false; unsubscribe(); };
  }, [userId, queryClient]);
  const current = state.exercises[Math.min(index, Math.max(0, state.exercises.length - 1))];
  const day = session.plan?.days.find((entry) => entry.day_number === state.selectedDay);
  const prescription = current ? findPrescription(day?.exercises ?? [], current.name) : undefined;
  const history = current ? previous?.byName[normalizeExerciseName(current.name)] : undefined;
  const exerciseSuggestions = [...collectPlanExerciseNames(session.plan?.days ?? []), ...(previous?.names ?? [])];
  const localStatus = state.isDirty && session.draftState !== 'error'
    ? session.draftState === 'writing' ? 'Saving on this device…'
      : session.draftState === 'saved' ? 'Draft saved on this device.' : 'Unsaved local changes'
    : null;
  const currentName = current?.name;
  useEffect(() => { if (currentName) AccessibilityInfo.announceForAccessibility(`Exercise ${index + 1} of ${state.exercises.length}: ${currentName}`); }, [currentName, index, state.exercises.length]);

  const leave = (action: NavigationAction) => { pendingNavigation.current = action; setAllowExit(true); };
  useEffect(() => { if (allowExit && pendingNavigation.current) navigation.dispatch(pendingNavigation.current); }, [allowExit, navigation]);
  usePreventRemove(!allowExit && (state.isDirty || Boolean(newExercise.trim()) || session.deliveryState === 'sending'), ({ data }) => {
    if (showingExit.current) return;
    showingExit.current = true;
    Alert.alert('Leave this workout?', 'Save your local changes to continue later, or discard only these local changes. Saved workouts stay in your history.', [
      { text: 'Keep editing', style: 'cancel', onPress: () => { showingExit.current = false; } },
      { text: 'Discard local changes', style: 'destructive', onPress: async () => {
        showingExit.current = false;
        if (session.deliveryState === 'sending') { setLocalError('Wait for the current save before discarding local changes.'); return; }
        if (await session.discardDraft()) { activity.end(); restActions.reset(); leave(data.action); }
      } },
      { text: 'Save draft & exit', onPress: async () => {
        showingExit.current = false;
        if (newExercise.trim()) { edit({ type: 'ADD_EXERCISE', payload: { name: newExercise.trim() } }); setNewExercise(''); }
        if (await session.flushDraft()) leave(data.action);
      } },
    ], { cancelable: true, onDismiss: () => { showingExit.current = false; } });
  });

  const addExercise = (suggestedName?: string) => {
    const name = suggestedName?.trim() || newExercise.trim();
    if (!name) return;
    edit({ type: 'ADD_EXERCISE', payload: { name } }); setNewExercise(''); setIndex(state.exercises.length); setOverview(false); Keyboard.dismiss();
  };
  const chooseDay = (dayNumber: number) => {
    const next = session.plan?.days.find((entry) => entry.day_number === dayNumber); if (!next || dayNumber === state.selectedDay) return;
    Alert.alert('Replace this session’s exercises?', 'Keep this draft to continue it later, or deliberately discard local entries and use this day. The saved server record is not deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Keep current draft', onPress: () => { void session.flushDraft(); } },
      { text: 'Replace local entries', style: 'destructive', onPress: async () => {
        if (!(await session.discardDraft())) return;
        activity.replace(); restActions.reset();
        edit({ type: 'LOAD_DEFAULT_PLAN', payload: { day: next.day_number, title: next.focus ? `Day ${next.day_number} — ${next.focus}` : `Day ${next.day_number}`, exercises: next.exercises.map(createDraftExerciseFromPlan) } }); setIndex(0); setSessionDetails(false);
      } },
    ]);
  };
  const finish = () => { activity.end(); restActions.reset(); Keyboard.dismiss(); setResult(reviewWorkout(state)); setSubmittedReview(false); setReview(true); };
  const nextUnfinishedIndex = current ? findNextUnfinishedExerciseIndex(state.exercises, index) : -1;
  const continueLabel = nextUnfinishedIndex >= 0 ? `Continue to ${state.exercises[nextUnfinishedIndex].name}` : 'Review workout';
  const continueWorkout = () => {
    Keyboard.dismiss();
    if (nextUnfinishedIndex >= 0) setIndex(nextUnfinishedIndex);
    else finish();
  };
  const save = async () => {
    activity.end(); restActions.reset();
    setSubmittedReview(true);
    setResult(reviewWorkout(state));
    setReceiptRevision((revision) => revision + 1);
    await session.save();
  };
  const status = session.deliveryState;

  if (session.recovery) return <WorkoutRecovery {...session.recovery} sending={status === 'sending'} error={session.error} onClose={() => router.back()} onReload={session.retry} onRetry={(id) => { void session.recoverSavedVersions(id).then((target) => { if (target) router.setParams({ logId: target.logId, outboxId: target.outboxId ?? '' }); }); }} />;

  if (session.entry.kind !== 'ready') return <Screen>
    <Button label="Close workout" variant="ghost" onPress={() => router.back()} />
    {session.entry.kind === 'loading' ? <SkeletonCard lines={4} /> : session.entry.kind === 'choose-log' ? <View style={{ gap: spacing.base }}>
      <Text variant="h1">Choose your workout</Text><Text variant="bodySm" tone="muted">{outboxId ? 'Choose which saved workout should receive the recovered content. Review it before retrying the save.' : 'There is more than one saved workout for this date.'}</Text>
      {session.entry.ids.map((id) => <Button key={id} label={session.records?.find((row) => row.id === id)?.title || 'Open workout'} variant="secondary" onPress={() => { void session.selectLog(id).then((target) => { if (target) router.setParams({ logId: target.logId, outboxId: target.outboxId ?? '' }); }); }} />)}
      {session.error ? <Text variant="bodySm" tone="destructive" accessibilityLiveRegion="polite">{session.error}</Text> : null}
    </View> : <View style={{ gap: spacing.base }}><Text variant="h1">Couldn’t open this workout</Text><Text variant="bodySm" tone="muted">{session.entry.reason === 'missing-log' ? 'This workout is missing or no longer available to your account. Choose a record from Training History.' : session.entry.reason === 'draft-unreadable' ? 'Your saved local workout could not be read. Retry without replacing it.' : 'Workout data is unavailable. Your saved work has not been replaced.'}</Text><Button label="Retry loading workout" onPress={session.retry} /><Button label="Back to history" variant="secondary" onPress={() => router.replace('/(app)/logs')} /></View>}
  </Screen>;

  if (session.legacyText !== undefined) return <Screen><Button label="Close workout" variant="ghost" onPress={() => router.back()} /><Text variant="h1">{state.title}</Text><Card><Text>{session.legacyText}</Text><Text variant="bodySm" tone="muted">This historical note is preserved in Training history. Structured set editing is unavailable for this note.</Text></Card></Screen>;

  if (review) return <Screen><WorkoutSummary result={result} syncStatus={!submittedReview || status === 'idle' ? 'review' : status} receiptRevision={receiptRevision} error={session.error} onEdit={() => { activity.resume(); setReview(false); }} onSave={() => void save()} onDone={() => router.back()} /></Screen>;
  const dock = <RestDock prescribedSeconds={prescription?.restSeconds} preference={rest.preference} onPreferenceChange={rest.change} preferenceError={rest.error} />;
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Screen archetype={inlineFooter ? 'child' : 'editor'} footerHeight={inlineFooter ? 0 : footerHeight}>
      <View style={{ gap: spacing.base }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close workout logger" style={({ pressed }) => ({ minHeight: HIT_SLOP_MIN, minWidth: HIT_SLOP_MIN, justifyContent: 'center', alignItems: 'center', borderRadius: 999, backgroundColor: pressed ? colors.pressed : 'transparent' })}><X size={iconSize.lg} color={colors.foreground} /></Pressable>
          <View style={{ flex: 1, minWidth: 100 }}><Text variant="h2">{format(parseLocalDate(date), 'EEE d MMM')}</Text></View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: spacing.xs, ...(compactHeader ? { width: '100%' as const } : {}) }}>
          <Pressable ref={overviewTrigger} testID="workout-overview" accessibilityRole="button" accessibilityLabel="Open workout overview" onPress={() => setOverview(true)} style={({ pressed }) => ({ minHeight: HIT_SLOP_MIN, justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: radius.sm, backgroundColor: pressed ? colors.primarySoft : 'transparent' })}><Text variant="bodySm" tone="primary">Overview</Text></Pressable>
          {state.exercises.length > 0 ? <Pressable testID="logger-finish-visible" accessibilityRole="button" accessibilityLabel="Finish workout" accessibilityHint="Review completed and incomplete sets before saving." onPress={finish} style={({ pressed }) => ({ minHeight: HIT_SLOP_MIN, justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: radius.sm, backgroundColor: pressed ? colors.primarySoft : 'transparent' })}><Text variant="bodySm" tone="primary">Finish</Text></Pressable> : null}
          </View>
        </View>
        {localStatus ? <Text variant="bodySm" tone="muted" accessibilityLiveRegion="polite">{localStatus}</Text> : null}
        {state.isDirty && session.draftState === 'error' ? <Text variant="bodySm" tone="destructive">Couldn’t save. Keep this screen open and retry.</Text> : !state.isDirty && (status === 'queued' || status === 'blocked' || status === 'synced') ? <RecordStatus value={status} /> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={'Edit session details. ' + (state.title || 'Untitled workout')} accessibilityState={{ expanded: sessionDetails }}
          onPress={() => { if (sessionDetails) Keyboard.dismiss(); setSessionDetails((open) => !open); }}
          style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: pressed ? colors.pressed : 'transparent' })}>
          <Text variant="bodySm" tone="muted" style={{ flex: 1 }}>{state.title || 'Untitled workout'}</Text>
          <Text variant="caption" tone="muted">{sessionDetails ? 'Close details' : 'Session details'}</Text>
          <DisclosureChevron expanded={sessionDetails} size={16} color={colors.mutedForeground} />
        </Pressable>
        <MotionReveal revision={sessionDetails ? 1 : 0}>
        {sessionDetails ? <View style={{ gap: spacing.base }}>
          <Input label="Workout title" value={state.title} onChangeText={(value) => edit({ type: 'SET_TITLE', payload: value })} />
          {session.plan?.days.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>{session.plan.days.map((entry) => <PlanDayButton key={entry.id} dayNumber={entry.day_number} focus={entry.focus} active={entry.day_number === state.selectedDay} onPress={() => chooseDay(entry.day_number)} />)}</ScrollView> : null}
        </View> : null}
        </MotionReveal>
        {current ? <>
          <Text variant="label" tone="muted">EXERCISE {index + 1} OF {state.exercises.length}</Text>
          <SwipeableSlide canPrev={index > 0} canNext={index < state.exercises.length - 1} onPrev={() => setIndex((value) => Math.max(0, value - 1))} onNext={() => setIndex((value) => Math.min(state.exercises.length - 1, value + 1))}>
            <ExerciseSlide exercise={current} prescription={prescription} targetReps={prescription?.reps} targetDuration={prescription?.duration} history={history}
              onUpdateSet={(setId, field, value) => { const setIndex = current.sets.findIndex((set) => set.id === setId); if (setIndex >= 0) edit({ type: 'UPDATE_SET', payload: { exerciseIndex: index, setIndex, field, value } }); }}
              onCompleteSet={(setId, suggestion: SetSuggestionValues) => { const setIndex = current.sets.findIndex((set) => set.id === setId); if (setIndex < 0) return false; const accepted = edit({ type: 'COMPLETE_SET', payload: { exerciseIndex: index, setIndex, suggestion } }); if (!accepted) return false; Keyboard.dismiss(); const seconds = prescription?.restSeconds ?? rest.preference.seconds; if (rest.preference.autoStart && seconds && seconds > 0) restActions.start(seconds, { haptic: false }); return true; }}
              onToggleSet={(setId) => { const setIndex = current.sets.findIndex((set) => set.id === setId); if (setIndex < 0) return; edit({ type: 'TOGGLE_SET', payload: { exerciseIndex: index, setIndex } }); Keyboard.dismiss(); }}
              onAddSet={() => edit({ type: 'ADD_SET', payload: { exerciseIndex: index } })}
              onRemoveSet={(setIndex) => edit({ type: 'REMOVE_SET', payload: { exerciseIndex: index, setIndex } })}
              onRestoreSet={(set, originalIndex) => edit({ type: 'RESTORE_SET', payload: { exerciseIndex: index, index: originalIndex, set } })}
              onContinue={continueWorkout}
              continueLabel={continueLabel}
              onSubstitute={(replacement) => Alert.alert(`Use ${replacement.name}?`, `Replace entered sets for ${current.name} in this session?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Replace exercise', style: 'destructive', onPress: () => edit({ type: 'REPLACE_EXERCISE', payload: { exerciseIndex: index, exercise: createDraftExerciseFromPlan(replacement, index) } }) }])} />
          </SwipeableSlide>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm }}>
            <Button label="Previous exercise" icon={<ChevronLeft size={iconSize.sm} color={colors.primary} />} variant="ghost" disabled={index === 0} onPress={() => setIndex((value) => value - 1)} />
            <Button label="Next exercise" icon={<ChevronRight size={iconSize.sm} color={colors.primary} />} variant="ghost" disabled={index >= state.exercises.length - 1} onPress={() => setIndex((value) => value + 1)} />
          </View>
        </> : <Card style={{ gap: spacing.base }}><Text variant="bodySm" tone="muted">No assigned workout is available yet. Add an exercise to start your session.</Text><Button testID="workout-empty-add" label="Add your first exercise" onPress={() => setOverview(true)} /></Card>}
        {keyboardVisible ? <Button label="Done with keyboard" variant="secondary" onPress={Keyboard.dismiss} /> : null}
        {inlineFooter ? <View testID="workout-rest-footer" style={{ gap: spacing.sm }}>{dock}{session.error || localError ? <Text variant="bodySm" tone="destructive">{session.error ?? localError}</Text> : null}</View> : null}
      </View>
    </Screen>
    {!inlineFooter ? <WorkoutRestFooter onHeightChange={setFooterHeight}>{dock}{session.error || localError ? <Text variant="bodySm" tone="destructive">{session.error ?? localError}</Text> : null}</WorkoutRestFooter> : null}
    <WorkoutOverviewSheet visible={overview} exercises={state.exercises} activeIndex={index} onClose={() => setOverview(false)} onSelect={setIndex}
      onFinish={() => { setOverview(false); finish(); }} newExerciseName={newExercise} onNewExerciseNameChange={setNewExercise} onAddExercise={addExercise} exerciseSuggestions={exerciseSuggestions} returnFocusRef={overviewTrigger} />
  </KeyboardAvoidingView>;
}
