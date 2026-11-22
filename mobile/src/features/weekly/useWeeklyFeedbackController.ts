import { useNavigation, usePreventRemove, type NavigationAction } from 'expo-router/react-navigation';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, findNodeHandle, Platform, ScrollView, View } from 'react-native';
import { WEEKLY_STEPS, emptyWeekly } from '@/components/weekly/steps';
import { useAuth } from '@/contexts/AuthContext';
import { useDailyCheckIns } from '@/hooks/useDashboardData';
import { useWeeklyFeedbackDraft } from '@/hooks/useWeeklyFeedbackDraft';
import { useHomeDate } from '@/features/home/useHomeDate';
import { validateWeeklyStep, type WeeklyFeedbackErrors, type WeeklyFeedbackForm, type WeeklyReportSnapshot } from '@/lib/weekly-feedback';
import { supabase } from '@/lib/supabase';
import { captureWeeklyReport, reconcileWeeklyDraft, restoreWeeklyReport, weeklyAutofill, type ConfirmedWeeklyReport } from './selectors';
import { useWeeklyFeedbackHistory } from './useWeeklyFeedbackHistory';

type FocusTarget = View & { focus?: () => void };

export function focusWeeklyTarget(
  target: FocusTarget | null,
  platform: typeof Platform.OS = Platform.OS,
) {
  if (!target) return;
  if (platform === 'web') {
    if (typeof target.focus === 'function') target.focus();
    return;
  }
  try {
    const handle = findNodeHandle(target);
    if (handle !== null) AccessibilityInfo.setAccessibilityFocus(handle);
  } catch {
    // The active section may unmount before a deferred accessibility focus runs.
  }
}

export function useWeeklyFeedbackController() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const flowIdentity = useMemo(() => ({ userId: user?.id }), [user?.id]);
  const activeFlowIdentityRef = useRef(flowIdentity);
  const { data: checkIns, isError: dailyRecordsError, refetch: retryDailyRecords } = useDailyCheckIns();
  const scrollRef = useRef<ScrollView>(null);
  const errorSummaryRef = useRef<View>(null);
  const stepTitleRef = useRef<View>(null);
  const pendingExitActionRef = useRef<{
    action: NavigationAction;
    identity: typeof flowIdentity;
  } | null>(null);

  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WeeklyFeedbackForm>(emptyWeekly);
  const [reportSnapshot, setReportSnapshot] = useState<WeeklyReportSnapshot | null>(null);
  const [acknowledgedReport, setAcknowledgedReport] = useState<ConfirmedWeeklyReport | null>(null);
  const answerRevisionRef = useRef(0);
  const inFlightRef = useRef(false);
  const committedRef = useRef(false);
  const currentDraftRef = useRef({ form, step, report: reportSnapshot });
  useLayoutEffect(() => { currentDraftRef.current = { form, step, report: reportSnapshot }; }, [form, step, reportSnapshot]);
  const [formOwnerUserId, setFormOwnerUserId] = useState<string | undefined>(user?.id);
  const [errors, setErrors] = useState<WeeklyFeedbackErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [exitError, setExitError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [hasUnsentChanges, setHasUnsentChanges] = useState(false);
  const [submissionCommitted, setSubmissionCommitted] = useState(false);
  const [cleanupPending, setCleanupPending] = useState(false);
  const [exitReady, setExitReady] = useState(0);
  const ownsCurrentForm = Boolean(user?.id && formOwnerUserId === user.id);

  const { loadDraft, saveDraft, clearDraft, draftStatus } = useWeeklyFeedbackDraft(user?.id);

  const { data: history, isLoading, isError, isFetching: historyFetching, refetch } = useWeeklyFeedbackHistory();
  const today = useHomeDate();

  const weekNumber = (history?.length ?? 0) + 1;
  const firstName = (user?.user_metadata?.full_name ?? '').split(' ')[0] || 'there';

  const liveReport = useMemo(() => weeklyAutofill(checkIns ?? [], today), [checkIns, today]);
  const report = useMemo(() => reportSnapshot ? restoreWeeklyReport(reportSnapshot) : liveReport, [reportSnapshot, liveReport]);
  const latestReportRef = useRef(liveReport);
  useLayoutEffect(() => { latestReportRef.current = liveReport; }, [liveReport]);
  const recovery = started && ownsCurrentForm && restored
    ? reconcileWeeklyDraft({ form, ...(reportSnapshot ? { report: reportSnapshot } : {}) }, history ?? [], today, acknowledgedReport)
    : { kind: 'editable' as const };
  const cleanupRequired = submissionCommitted || recovery.kind === 'cleanup';
  const historyReady = history !== undefined && !isLoading && !isError && !historyFetching;

  useLayoutEffect(() => {
    activeFlowIdentityRef.current = flowIdentity;
    pendingExitActionRef.current = null;
    setStarted(false);
    setStep(0);
    setForm(emptyWeekly());
    setReportSnapshot(null);
    setAcknowledgedReport(null);
    answerRevisionRef.current = 0;
    inFlightRef.current = false;
    committedRef.current = false;
    setFormOwnerUserId(undefined);
    setErrors({});
    setSubmitting(false);
    setSubmitted(false);
    setSubmitError(null);
    setExitError(null);
    setRestored(false);
    setHasUnsentChanges(false);
    setSubmissionCommitted(false);
    setCleanupPending(false);
    setExitReady(0);
  }, [flowIdentity]);

  useEffect(() => {
    if (!user?.id) {
      setFormOwnerUserId(undefined);
      setRestored(true);
      return;
    }
    let active = true;
    setRestored(false);
    void loadDraft().then((draft) => {
      if (!active || activeFlowIdentityRef.current !== flowIdentity) return;
      const currentReport = latestReportRef.current;
      if (draft) {
        // Legacy drafts keep every answer; their unrecorded date provenance stays explicit.
        const snapshot = draft.report ?? { ...captureWeeklyReport(weeklyAutofill([], currentReport.window.to)), inferred: true };
        const restoredForm = { ...emptyWeekly(), ...draft.form };
        setReportSnapshot(snapshot);
        setForm(restoredForm);
        if (!draft.report) void saveDraft(restoredForm, draft.step, { immediate: true, report: snapshot });
        setFormOwnerUserId(user.id);
        setStep(draft.step);
        setStarted(true);
        setHasUnsentChanges(true);
      } else {
        setForm({ ...emptyWeekly(), ...currentReport.form });
        setReportSnapshot(null);
        setFormOwnerUserId(user.id);
        setStep(0);
        setStarted(false);
        setHasUnsentChanges(false);
      }
      setRestored(true);
    });
    return () => {
      active = false;
    };
  }, [flowIdentity, loadDraft, saveDraft, user?.id]);

  useEffect(() => {
    if (
      !ownsCurrentForm ||
      !restored ||
      !started ||
      submitted ||
      cleanupRequired ||
      !hasUnsentChanges
    ) {
      return;
    }
    void saveDraft(form, step, { report: reportSnapshot ?? undefined });
  }, [
    form,
    hasUnsentChanges,
    ownsCurrentForm,
    restored,
    saveDraft,
    started,
    step,
    cleanupRequired,
    reportSnapshot,
    submitted,
  ]);

  useLayoutEffect(() => {
    if (!started) return;
    const current = WEEKLY_STEPS[step];
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    focusWeeklyTarget(stepTitleRef.current as FocusTarget | null);
    AccessibilityInfo.announceForAccessibility(
      `Step ${step + 1} of ${WEEKLY_STEPS.length}: ${current.title}`,
    );
  }, [started, step]);

  useEffect(() => {
    const pendingExit = pendingExitActionRef.current;
    if (
      !exitReady ||
      hasUnsentChanges ||
      cleanupRequired ||
      !pendingExit ||
      pendingExit.identity !== activeFlowIdentityRef.current
    ) {
      return;
    }
    pendingExitActionRef.current = null;
    navigation.dispatch(pendingExit.action);
  }, [exitReady, hasUnsentChanges, navigation, cleanupRequired]);

  const permitExit = useCallback(
    (action: NavigationAction, identity: typeof flowIdentity) => {
      if (activeFlowIdentityRef.current !== identity) return;
      pendingExitActionRef.current = { action, identity };
      setHasUnsentChanges(false);
      setStarted(false);
      setSubmissionCommitted(false);
      setCleanupPending(false);
      setExitReady((value) => value + 1);
    },
    [],
  );

  usePreventRemove(
    ownsCurrentForm && (hasUnsentChanges || cleanupRequired) && !submitted,
    ({ data }) => {
      const alertIdentity = flowIdentity;
      if (cleanupRequired) {
        Alert.alert(
          'Finish local cleanup?',
          'Your check-in was submitted, but its saved draft still needs to be removed from this device.',
          [
            { text: 'Keep here', style: 'cancel' },
            {
              text: 'Retry cleanup & exit',
              onPress: async () => {
                const cleared = await clearDraft();
                if (activeFlowIdentityRef.current !== alertIdentity) return;
                if (cleared) {
                  permitExit(data.action, alertIdentity);
                  return;
                }
                setExitError('Check-in sent, but local draft cleanup still failed. Try again.');
              },
            },
          ],
        );
        return;
      }

      Alert.alert('Leave weekly check-in?', 'Your answers have not been submitted yet.', [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard draft',
          style: 'destructive',
          onPress: async () => {
            const cleared = await clearDraft();
            if (activeFlowIdentityRef.current !== alertIdentity) return;
            if (cleared) {
              permitExit(data.action, alertIdentity);
              return;
            }
            setExitError('Couldn’t discard your draft. Keep editing and try again.');
          },
        },
        {
          text: 'Save draft & exit',
          onPress: async () => {
            setExitError(null);
            const saved = await saveDraft(form, step, { immediate: true, report: reportSnapshot ?? undefined });
            if (activeFlowIdentityRef.current !== alertIdentity) return;
            if (saved) {
              permitExit(data.action, alertIdentity);
              return;
            }
            const message = 'Couldn’t save your draft. Keep editing and try again.';
            setExitError(message);
            AccessibilityInfo.announceForAccessibility(message);
          },
        },
      ]);
    },
  );

  const focusErrors = useCallback((nextErrors: WeeklyFeedbackErrors) => {
    setErrors(nextErrors);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    requestAnimationFrame(() => {
      focusWeeklyTarget(errorSummaryRef.current as FocusTarget | null);
    });
  }, []);

  const validateCurrentStep = useCallback(() => {
    if (!ownsCurrentForm || activeFlowIdentityRef.current !== flowIdentity) return false;
    const nextErrors = validateWeeklyStep(step, form);
    if (Object.keys(nextErrors).length) {
      focusErrors(nextErrors);
      return false;
    }
    setErrors({});
    return true;
  }, [flowIdentity, focusErrors, form, ownsCurrentForm, step]);

  const moveToStep = useCallback((nextStep: number) => {
    if (!ownsCurrentForm || activeFlowIdentityRef.current !== flowIdentity) return;
    setErrors({});
    setSubmitError(null);
    currentDraftRef.current = { ...currentDraftRef.current, step: nextStep };
    setStep(nextStep);
    setHasUnsentChanges(true);
  }, [flowIdentity, ownsCurrentForm]);

  const continueForward = useCallback(() => {
    if (!validateCurrentStep()) return;
    moveToStep(step + 1);
  }, [moveToStep, step, validateCurrentStep]);

  const updateField = useCallback((key: string, value: string) => {
    if (!ownsCurrentForm || activeFlowIdentityRef.current !== flowIdentity || committedRef.current) return;
    answerRevisionRef.current += 1;
    const nextForm = { ...currentDraftRef.current.form, [key]: value };
    currentDraftRef.current = { ...currentDraftRef.current, form: nextForm };
    setForm(nextForm);
    setErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
    setSubmitError(null);
    setExitError(null);
    setHasUnsentChanges(true);
  }, [flowIdentity, ownsCurrentForm]);

  const showSubmissionSuccess = useCallback((identity: typeof flowIdentity) => {
    if (activeFlowIdentityRef.current !== identity) return;
    setSubmissionCommitted(false);
    setCleanupPending(false);
    setSubmitError(null);
    setSubmitted(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    AccessibilityInfo.announceForAccessibility('Weekly check-in submitted.');
  }, []);

  const retryCleanup = useCallback(async () => {
    if (!ownsCurrentForm || activeFlowIdentityRef.current !== flowIdentity || !cleanupRequired) return;
    const cleanupIdentity = flowIdentity;
    setSubmitting(true);
    setExitError(null);
    const cleared = await clearDraft();
    if (activeFlowIdentityRef.current !== cleanupIdentity) return;
    setSubmitting(false);
    if (cleared) {
      showSubmissionSuccess(cleanupIdentity);
      return;
    }
    setCleanupPending(true);
    setSubmitError('Check-in sent, but its saved draft could not be cleared from this device.');
  }, [clearDraft, cleanupRequired, flowIdentity, ownsCurrentForm, showSubmissionSuccess]);

  const submit = useCallback(async () => {
    if (!user?.id || !reportSnapshot || inFlightRef.current || cleanupRequired || recovery.kind === 'conflict' || !validateCurrentStep()) return;
    if (!historyReady) {
      setSubmitError('Retry submitted history before sending. Your saved answers are kept.');
      return;
    }
    const submissionIdentity = flowIdentity;
    const submissionUserId = user.id;
    const sentForm = { ...form };
    const sentRevision = answerRevisionRef.current;
    const sentReport = reportSnapshot;
    const weekStart = restoreWeeklyReport(sentReport).window.from;
    inFlightRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { error } = await supabase.from('weekly_check_ins').insert({
        ...sentForm, user_id: submissionUserId, week_start_date: weekStart,
      });
      if (error) throw error;
      void queryClient.invalidateQueries({ queryKey: ['weeklyCheckIns', submissionUserId] });
      if (activeFlowIdentityRef.current !== submissionIdentity) return;
      setAcknowledgedReport({ form: sentForm, weekStart });

      if (answerRevisionRef.current !== sentRevision) {
        // The server accepted the earlier snapshot. Keep later edits as a protected draft.
        setHasUnsentChanges(true);
        await saveDraft(currentDraftRef.current.form, currentDraftRef.current.step, { immediate: true, report: sentReport });
        return;
      }
      committedRef.current = true;
      setSubmissionCommitted(true);
      setHasUnsentChanges(false);
      const cleared = await clearDraft();
      if (activeFlowIdentityRef.current !== submissionIdentity) return;
      if (!cleared) {
        setCleanupPending(true);
        setSubmitError('Check-in sent, but its saved draft could not be cleared from this device.');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      showSubmissionSuccess(submissionIdentity);
    } catch {
      if (activeFlowIdentityRef.current !== submissionIdentity) return;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSubmitError("Couldn’t submit. Your answers are still here — check your connection and retry.");
    } finally {
      if (activeFlowIdentityRef.current === submissionIdentity) {
        inFlightRef.current = false;
        setSubmitting(false);
      }
    }
  }, [clearDraft, cleanupRequired, flowIdentity, form, historyReady, queryClient, recovery.kind, reportSnapshot, saveDraft, showSubmissionSuccess, user?.id, validateCurrentStep]);

  const saveCurrentDraft = () => saveDraft(form, step, { immediate: true, report: reportSnapshot ?? undefined });
  const discardConflictingDraft = () => {
    const discardIdentity = flowIdentity;
    const discardRevision = answerRevisionRef.current;
    Alert.alert('Discard saved draft?', 'Only this device draft will be removed. Your submitted report will stay saved.', [
      { text: 'Keep draft', style: 'cancel' },
      { text: 'Discard draft', style: 'destructive', onPress: async () => {
        if (activeFlowIdentityRef.current !== discardIdentity || answerRevisionRef.current !== discardRevision) return;
        const cleared = await clearDraft();
        if (activeFlowIdentityRef.current !== discardIdentity || answerRevisionRef.current !== discardRevision) return;
        if (!cleared) { setExitError('Couldn’t discard your draft. It has been kept on this device.'); return; }
        setHasUnsentChanges(false);
        setStarted(false);
        setForm(emptyWeekly());
        setReportSnapshot(null);
        setAcknowledgedReport(null);
        setSubmissionCommitted(false);
        committedRef.current = false;
        setExitError(null);
      } },
    ]);
  };

  const start = () => {
    if (!ownsCurrentForm || activeFlowIdentityRef.current !== flowIdentity) return;
    const snapshot = captureWeeklyReport(latestReportRef.current);
    setReportSnapshot(snapshot);
    setForm({ ...emptyWeekly(), ...snapshot.prefill });
    setAcknowledgedReport(null);
    committedRef.current = false;
    setStarted(true);
    setHasUnsentChanges(true);
  };

  return {
    user, firstName, submitted, isLoading, restored, ownsCurrentForm,
    submissionCommitted: cleanupRequired, submitError, cleanupPending, retryCleanup, submitting,
    started, weekNumber, start, history, isError, refetch, step, form, errors,
    scrollRef, errorSummaryRef, stepTitleRef, updateField, exitError, draftStatus,
    moveToStep, submit, continueForward, report, dailyRecordsError, retryDailyRecords,
    conflictingReport: recovery.kind === 'conflict' ? recovery.submitted : null,
    discardConflictingDraft, saveCurrentDraft, historyReady, inferredReportDate: Boolean(reportSnapshot?.inferred),
  };
}
