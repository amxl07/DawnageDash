import { useFocusEffect, useNavigation, usePreventRemove } from 'expo-router/react-navigation';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, findNodeHandle, Keyboard, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';

import { CheckInForm } from '@/components/checkin/CheckInForm';
import { CheckInStageHeader } from '@/components/checkin/CheckInStageHeader';
import { CheckInDateHistorySheet } from '@/features/checkin/components/CheckInDateHistorySheet';
import { createCheckInIntentQueue } from '@/features/checkin/checkInIntent';
import { Button, ErrorState, Screen, SkeletonCard, StickyActionBar, Text } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { registerCheckInExitGuard } from '@/features/checkin/checkInExitGuard';
import { CheckInCompletion } from '@/features/checkin/components/CheckInCompletion';
import { DailyRecordHeader } from '@/features/checkin/components/DailyRecordHeader';
import { MotionReveal } from '@/components/ui/MotionReveal';
import { NumericCommitProvider, useNumericCommits } from '@/features/checkin/components/NumericCommitProvider';
import { CHECK_IN_FIELDS } from '@/features/checkin/config/fields';
import { buildHistoryStats } from '@/features/checkin/history';
import type { CheckInStep, FormState } from '@/features/checkin/model';
import { useCheckInEditor } from '@/features/checkin/useCheckInEditor';
import { findPreviousCheckIn } from '@/hooks/useCheckInMutation';
import { useUserProfile } from '@/hooks/usePlans';
import { resolveProgramStatus } from '@/features/program/program-status';
import { FirstCheckInNotice } from '@/features/program/FirstCheckInNotice';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { processCheckInHistory, type RawDailyCheckIn } from '@/lib/checkin-utils';
import { validateCheckIn, validateCheckInStep } from '@/lib/checkin-validation';
import { isDateKeyStrict, localDateString } from '@/lib/dates';
import { spacing, useMotion } from '@/theme';

const STEPS: CheckInStep[] = ['readiness', 'recovery', 'adherence', 'finish'];
const NUMERIC_BOUNDARY_ERROR = 'Correct the highlighted number or clear it before continuing.';
export default function CheckInScreen() {
  const { user } = useAuth();
  return <NumericCommitProvider key={user?.id ?? 'signed-out'}><CheckInJourney /></NumericCommitProvider>;
}

export function CheckInJourney() {
  const params = useLocalSearchParams<{ date?: string | string[]; history?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const requested = params.date;
  const dateProblem = requested !== undefined && (typeof requested !== 'string' || !isDateKeyStrict(requested))
    ? 'This reporting date is not valid. Use a calendar date written as YYYY-MM-DD.'
    : typeof requested === 'string' && requested > localDateString()
      ? 'Future days are not available. A check-in records a day you have lived.' : null;
  const hasShownValidDate = useRef(!dateProblem);
  if (!dateProblem) hasShownValidDate.current = true;
  const initialDate = useRef(typeof requested === 'string' && !dateProblem ? requested : localDateString()).current;
  const editor = useCheckInEditor(initialDate);
  const profile = useUserProfile();
  const program = resolveProgramStatus({
    today: localDateString(), startDate: profile.data?.package_start_date,
    checkInDates: [...(editor.checkIns?.map((row) => row.date) ?? []), ...(editor.receipt?.status === 'synced' ? [editor.receipt.date] : [])],
    pendingDates: editor.localRecords?.map((row) => row.date) ?? [],
    ready: profile.data !== undefined && profile.data !== null && !profile.isError && !profile.isFetching && profile.fetchStatus !== 'paused' && editor.checkIns !== undefined && !editor.historyIsStale && !editor.historyRefreshing && editor.loadState === 'ready',
  });
  const firstCheckIn = program.kind === 'not-started';
  const [firstReceiptDate, setFirstReceiptDate] = useState<string | null>(null);
  const editorRef = useRef(editor); editorRef.current = editor;
  const commits = useNumericCommits();
  const motion = useMotion();
  const responsive = useResponsiveLayout();
  const [editing, setEditing] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(params.history === '1');
  const [footerHeight, setFooterHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [boundaryError, setBoundaryError] = useState<string | null>(null);
  const [stepErrors, setStepErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [focusField, setFocusField] = useState<keyof FormState | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const fields = useRef(new Map<keyof FormState, View | TextInput>());
  const mounted = useRef(true);
  const intents = useMemo(() => createCheckInIntentQueue((date) => mounted.current && editorRef.current.date === date), []);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; intents.clear(); }; }, [intents]);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const discarding = useRef(false);
  const previousParam = useRef(requested);
  const showReceipt = !!editor.receipt && !editing && !editor.hasEdits && !editor.hasPendingNumericEdits && editor.deliveryState !== 'blocked';
  const isToday = editor.date === localDateString();
  const previous = useMemo(() => findPreviousCheckIn(editor.checkIns, editor.date), [editor.checkIns, editor.date]);
  const history = useMemo(() => buildHistoryStats(editor.checkIns, editor.date), [editor.checkIns, editor.date]);
  const processed = useMemo(() => processCheckInHistory((editor.checkIns ?? []) as RawDailyCheckIn[]), [editor.checkIns]);
  const inlineActions = responsive.height < 650 || responsive.fontScale >= 1.5 || keyboardVisible;

  const commitNumbers = useCallback(() => {
    if (commits?.flush() === false) {
      setBoundaryError(NUMERIC_BOUNDARY_ERROR);
      return false;
    }
    setBoundaryError((current) => current === NUMERIC_BOUNDARY_ERROR ? null : current);
    return true;
  }, [commits]);
  const flush = useCallback(async () => {
    if (!commitNumbers()) return false;
    const reportingScope = editorRef.current;
    const saved = await reportingScope.flushDraft();
    if (!mounted.current || editorRef.current.getSnapshot !== reportingScope.getSnapshot) return false;
    if (!saved) setBoundaryError('Changes could not be saved on this device. Retry to stay safe, or discard this draft deliberately.');
    else setBoundaryError(null);
    return saved;
  }, [commitNumbers]);
  const exit = useCallback((action: () => void) => {
    const intent = intents.replace('exit', editorRef.current.date, async (isCurrent) => {
      if (!await flush() || !isCurrent()) return false;
      action();
      return true;
    });
    return intent.run();
  }, [flush, intents]);

  usePreventRemove(editor.loadState === 'ready' && !showReceipt, ({ data }) => { void exit(() => navigation.dispatch(data.action)); });
  useFocusEffect(useCallback(() => {
    void editorRef.current.refreshDelivery();
    if (editor.loadState !== 'ready') return;
    const unregister = registerCheckInExitGuard((replay) => exit(replay));
    return () => { unregister(); void flush(); };
  }, [flush, exit, editor.loadState]));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => { if (state !== 'active' && editorRef.current.loadState === 'ready') void flush(); });
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { subscription.remove(); show.remove(); hide.remove(); };
  }, [flush]);
  useEffect(() => { if (params.history === '1') setHistoryVisible(true); }, [params.history]);

  const changeDate = useCallback((date: string) => {
    const intent = intents.replace('date', editorRef.current.date, async (isCurrent) => {
      // Capture the target before either numeric validation or durable storage can fail.
      if (!commitNumbers()) return false;
      if (!await editorRef.current.requestDateChange(date, isCurrent)) {
        if (isCurrent()) setBoundaryError('This day is still open because the draft could not be saved. Retry before changing dates.');
        return false;
      }
      setEditing(false); setFocusField(null); setStepErrors({}); setBoundaryError(null);
      router.setParams({ date, history: undefined });
      return true;
    });
    return intent.run();
  }, [commitNumbers, intents, router]);

  useEffect(() => {
    if (requested === previousParam.current) return;
    if (editor.loadState !== 'ready') return;
    previousParam.current = requested;
    if (!dateProblem && editor.loadState === 'ready') void changeDate(typeof requested === 'string' ? requested : localDateString());
  }, [requested, dateProblem, editor.loadState, changeDate]);

  const revealField = useCallback((field: keyof FormState) => {
    const definition = CHECK_IN_FIELDS.find(({ id }) => id === field)!;
    editorRef.current.setStep(STEPS.indexOf(definition.section));
    setFocusField(field); setFocusRequest((request) => request + 1); setEditing(true);
  }, []);
  useEffect(() => {
    if (!focusField) return;
    let attempts = 0;
    let frame: number | null = null;
    const focusAfterMount = () => {
      attempts += 1;
      const node = fields.current.get(focusField);
      if (!node && attempts < 3) {
        frame = requestAnimationFrame(focusAfterMount);
        return;
      }
      if (!node) return;
      if (Platform.OS === 'web') {
        const webNode = node as unknown as { focus?: () => void; scrollIntoView?: (options?: { block?: string; behavior?: string }) => void };
        webNode.scrollIntoView?.({ block: 'center', behavior: motion.enabled ? 'smooth' : 'auto' });
        webNode.focus?.();
        return;
      }
      const content = scrollRef.current?.getInnerViewNode();
      if (content != null) node.measureLayout(content, (_x, y) => scrollRef.current?.scrollTo({ y: Math.max(0, y - spacing.lg), animated: motion.enabled }), () => {});
      if (typeof (node as TextInput).isFocused === 'function') (node as TextInput).focus();
      const handle = findNodeHandle(node);
      if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
    };
    frame = requestAnimationFrame(focusAfterMount);
    return () => { if (frame !== null) cancelAnimationFrame(frame); };
  }, [editor.step, focusField, focusRequest, motion.enabled]);
  const registerField = useCallback((field: keyof FormState, node: View | TextInput | null) => { if (node) fields.current.set(field, node); else fields.current.delete(field); }, []);
  useEffect(() => { if (editor.firstInvalidField) revealField(editor.firstInvalidField); }, [editor.firstInvalidField, revealField]);
  const updateForm = useCallback((updater: (previous: FormState) => FormState) => {
    setStepErrors({});
    setFocusField(null);
    editorRef.current.updateForm(updater);
  }, []);
  const visibleErrors = useMemo(() => ({ ...editor.errors, ...stepErrors }), [editor.errors, stepErrors]);

  const submit = async () => {
    if (!commitNumbers()) return;
    const starting = firstCheckIn;
    const reportingDate = editorRef.current.date;
    const reportingScope = editorRef.current.getSnapshot;
    const result = await editorRef.current.submit();
    if (!mounted.current || editorRef.current.getSnapshot !== reportingScope) return;
    if (result === 'invalid') {
      AccessibilityInfo.announceForAccessibility('Please complete the highlighted fields.');
      const errors = validateCheckIn(editorRef.current.getSnapshot()).errors;
      setStepErrors(errors);
      const first = CHECK_IN_FIELDS.find(({ id }) => errors[id]);
      if (first) revealField(first.id);
    }
    if (result === 'queued' || result === 'synced') {
      if (starting) setFirstReceiptDate(reportingDate);
      AccessibilityInfo.announceForAccessibility(result === 'synced' ? 'Check-in saved and synced.' : 'Check-in saved on this device. Waiting to sync.');
      // Only this explicit submit requests the receipt. Newer work still gates rendering.
      if (mounted.current) setEditing(false);
    }
  };
  const next = () => {
    if (!commitNumbers()) return;
    const errors = validateCheckInStep(STEPS[editor.step], editor.getSnapshot());
    setStepErrors(errors);
    const first = CHECK_IN_FIELDS.find(({ id }) => errors[id]);
    if (first) {
      AccessibilityInfo.announceForAccessibility('Please complete the highlighted fields.');
      revealField(first.id);
      return;
    }
    setFocusField(null);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    editor.setStep(Math.min(3, editor.step + 1));
  };
  const back = () => {
    if (!commitNumbers()) return;
    setStepErrors({});
    setFocusField(null);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    editor.setStep(Math.max(0, editor.step - 1));
  };
  const editSection = (step: CheckInStep) => {
    if (!commitNumbers()) return;
    setStepErrors({});
    setFocusField(null);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    editor.setStep(STEPS.indexOf(step));
  };
  const closeHistory = () => { setHistoryVisible(false); router.setParams({ history: undefined }); };
  const retryBoundary = () => {
    if (intents.current) void intents.current.run();
    else if (boundaryError || editor.draftState === 'error') void flush();
    else void submit();
  };
  const discard = async () => {
    if (discarding.current) return;
    discarding.current = true; setIsDiscarding(true);
    const intent = intents.current;
    try {
      if (!await editorRef.current.discardDraft() || !mounted.current) return;
      setBoundaryError(null);
      if (intent && intents.current === intent) await intent.run();
      else if (!intents.current) setEditing(false);
    } finally { discarding.current = false; if (mounted.current) setIsDiscarding(false); }
  };
  const openHistory = () => { setHistoryVisible(true); void editorRef.current.refreshDelivery(); };
  const historySheet = <CheckInDateHistorySheet visible={historyVisible} processed={processed} localRecords={editor.localRecords ?? []} onClose={closeHistory} onSelectDay={(date) => { void changeDate(date); }} />;


  if (dateProblem && !hasShownValidDate.current) return <Screen archetype="root"><View style={{ gap: spacing.lg }}><Text variant="h1">Choose a reporting day</Text><Text accessibilityRole="alert">{dateProblem}</Text><Button label="Return to today" onPress={() => { void changeDate(localDateString()); }} /></View></Screen>;
  if (editor.loadState === 'loading') return <Screen archetype="root"><SkeletonCard lines={3} /><SkeletonCard lines={3} /></Screen>;
  if (editor.loadState === 'error') return <><Screen archetype="root"><ErrorState title="Your record needs recovery" message={editor.recoveryMessage ?? undefined} onRetry={editor.retryLoad} />{editor.canStartLocal ? <Button label="Start a local record for this day" variant="secondary" onPress={editor.startLocalDraft} /> : null}{editor.localRecords?.length ? <Button label="Choose a saved day" variant="secondary" onPress={openHistory} /> : null}</Screen>{historySheet}</>;

  const isReview = editor.step === 3;
  const primaryLabel = isReview
    ? editor.existing || editor.receipt
      ? 'Save changes'
      : firstCheckIn
        ? 'Save check-in & start Day 1'
        : isToday
        ? 'Submit check-in'
        : 'Submit for this day'
    : 'Continue';
  const actions = <>
    <Button testID={isReview ? 'checkin-save' : 'checkin-next'} label={primaryLabel} onPress={isReview ? () => { void submit(); } : next} loading={editor.isSubmitting} disabled={isDiscarding} />
    {editor.step > 0 ? <Button label="Back" variant="ghost" onPress={back} /> : null}
  </>;
  const blockedCopy = editor.failure?.kind === 'auth' ? 'Your session needs to be refreshed. Retry to sign in again and send the preserved record.' : editor.failure?.kind === 'permission' ? 'This account does not currently have permission to sync the record. Your values are preserved. Retry after access is restored.' : editor.failure?.kind === 'conflict' ? 'Another record conflicts with this save. Your values are preserved. Review the selected date before retrying.' : 'This record needs a correction before it can sync. Review the values and retry.';
  const flowRevision = showReceipt && editor.receipt
    ? `receipt:${editor.date}:${editor.receipt.generation}`
    : `step:${editor.date}:${editor.step}`;
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Screen ref={scrollRef} archetype="root" footerHeight={inlineActions || showReceipt ? 0 : footerHeight}>
      <MotionReveal revision={flowRevision} style={{ gap: spacing.lg }} testID="checkin-flow-handoff">
        {dateProblem ? <View style={{ gap: spacing.sm }}><Text accessibilityRole="alert">{dateProblem}</Text><Button label="Return to today" variant="secondary" onPress={() => { void changeDate(localDateString()); }} /></View> : null}
        {showReceipt && editor.receipt ? <CheckInCompletion receipt={editor.receipt} firstCheckIn={firstReceiptDate === editor.date} onEdit={() => setEditing(true)} onHome={() => router.navigate('/(app)/(tabs)')} /> : <>
          <DailyRecordHeader editor={editor} onHistory={openHistory} />
          {firstCheckIn && (editor.step === 0 || isReview) ? <FirstCheckInNotice date={editor.date} review={isReview} /> : null}
          {program.kind === 'unknown' && isReview && !editor.existing && !editor.receipt ? <Text variant="bodySm" tone="muted">If this is your first check-in, submitting it starts Day 1 on the reporting date above. Saving a draft does not start your program.</Text> : null}
          {!isToday ? <Text variant="bodySm" tone="muted">{editor.existing ? 'Editing a historical record.' : 'Recording a past day.'} This date stays selected until you change it.</Text> : null}
          {editor.historyIsStale ? <Text variant="bodySm" tone="muted">Showing saved history. Recent updates are unavailable.</Text> : null}
          {Object.keys(visibleErrors).length ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite">Please complete the highlighted fields.</Text> : null}
          <CheckInStageHeader step={STEPS[editor.step]} stepIndex={editor.step} totalSteps={4} date={editor.date} />
          <CheckInForm form={editor.form} setForm={updateForm} previous={previous} errors={visibleErrors} step={STEPS[editor.step]} history={history} showCarryForward focusField={focusField} focusRequest={focusRequest} registerField={registerField} onEditSection={editSection} />
          {editor.deliveryState === 'blocked' ? <View style={{ gap: spacing.sm }}><Text accessibilityRole="alert">{blockedCopy}</Text><Button label="Retry sync" variant="secondary" onPress={() => { void submit(); }} disabled={editor.isSubmitting} /></View> : null}
          {editor.recoveryMessage || boundaryError ? <View style={{ gap: spacing.sm }}><Text accessibilityRole="alert">{boundaryError ?? editor.recoveryMessage}</Text><Button label="Retry saving" variant="secondary" onPress={retryBoundary} disabled={isDiscarding} /><Button label="Discard draft" variant="ghost" disabled={editor.isSubmitting || isDiscarding} onPress={() => { void discard(); }} />{intents.current?.kind === 'date' ? <Button label="Stay on this day" variant="ghost" onPress={() => { intents.clear(); setBoundaryError(null); router.setParams({ date: editorRef.current.date, history: undefined }); }} /> : null}</View> : null}
          {inlineActions ? <View style={{ gap: spacing.sm }}>{actions}</View> : null}
          <Button label="Save draft and return Home" variant="ghost" onPress={() => { void exit(() => router.navigate('/(app)/(tabs)')); }} />
        </>}
        {showReceipt && editor.recoveryMessage ? <Text accessibilityRole="alert">{editor.recoveryMessage}</Text> : null}
        {!isToday && !dateProblem ? <Button label="Return to today" variant="ghost" onPress={() => { void changeDate(localDateString()); }} /> : null}
        {showReceipt ? <Button label="History" variant="ghost" onPress={openHistory} /> : null}
      </MotionReveal>
    </Screen>
    {!inlineActions && !showReceipt ? <StickyActionBar onHeightChange={setFooterHeight} primaryTestID={isReview ? 'checkin-save' : 'checkin-next'} primaryLabel={primaryLabel} onPrimary={isReview ? () => { void submit(); } : next} primaryLoading={editor.isSubmitting} primaryDisabled={isDiscarding} secondaryLabel={editor.step > 0 ? 'Back' : undefined} onSecondary={editor.step > 0 ? back : undefined} /> : null}
    {historySheet}
  </KeyboardAvoidingView>;
}
