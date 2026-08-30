import { useNavigation, usePreventRemove, type NavigationAction } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Camera, CheckCircle2, Ruler } from 'lucide-react-native';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  findNodeHandle,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';

import { CoachBadge } from '@/components/coach/CoachBadge';
import {
  AnimatedFlatList,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  OptionRow,
  PageHeader,
  ProgressBar,
  RatingRow,
  Screen,
  SkeletonCard,
  StatusPill,
  StickyActionBar,
  Text,
  useListMotion,
} from '@/components/ui';
import { WEEKLY_SECTIONS, WEEKLY_STEPS, emptyWeekly } from '@/components/weekly/steps';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useWeeklyFeedbackDraft } from '@/hooks/useWeeklyFeedbackDraft';
import {
  validateWeeklyStep,
  weeklyAnswer,
  type WeeklyCheckIn,
  type WeeklyFeedbackErrors,
  type WeeklyFeedbackForm,
} from '@/lib/weekly-feedback';
import { supabase } from '@/lib/supabase';
import { num } from '@/types/db';
import { iconSize, spacing, useTheme } from '@/theme';

type HistoryCardProps = {
  item: WeeklyCheckIn;
  weekNumber: number;
};

const WeeklyFeedbackHistoryCard = memo(function WeeklyFeedbackHistoryCard({
  item,
  weekNumber,
}: HistoryCardProps) {
  return (
    <Card style={{ gap: spacing.sm, marginBottom: spacing.md }}>
      <Text variant="h2">Week {weekNumber}</Text>
      <Text variant="bodySm" tone="muted">
        {item.created_at ? format(new Date(item.created_at), 'd MMM yyyy') : 'Date unavailable'}
      </Text>
      {WEEKLY_SECTIONS.map((section) => {
        const answered = section.keys
          .map((key) => ({ key, value: weeklyAnswer(item, key) }))
          .filter((answer): answer is { key: string; value: string } => Boolean(answer.value));
        if (!answered.length) return null;
        return (
          <View key={section.title} style={{ gap: spacing.xs, paddingTop: spacing.sm }}>
            <Text variant="label" tone="muted">
              {section.title}
            </Text>
            {answered.map(({ key, value }) => (
              <Text key={key} variant="bodySm" selectable>
                {value}
              </Text>
            ))}
          </View>
        );
      })}
    </Card>
  );
});

export default function WeeklyFeedbackScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const flowIdentity = useMemo(() => ({ userId: user?.id }), [user?.id]);
  const activeFlowIdentityRef = useRef(flowIdentity);
  const { checkIns } = useDashboardData();
  const listMotion = useListMotion();
  const scrollRef = useRef<ScrollView>(null);
  const errorSummaryRef = useRef<View>(null);
  const pendingExitActionRef = useRef<{
    action: NavigationAction;
    identity: typeof flowIdentity;
  } | null>(null);

  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WeeklyFeedbackForm>(emptyWeekly);
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

  const { data: history, isLoading, isError, refetch } = useQuery({
    queryKey: ['weeklyCheckIns', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('weekly_check_ins')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WeeklyCheckIn[];
    },
    enabled: Boolean(user?.id),
  });

  const weekNumber = (history?.length ?? 0) + 1;
  const firstName = (user?.user_metadata?.full_name ?? '').split(' ')[0] || 'there';

  const prefill = useMemo<WeeklyFeedbackForm>(() => {
    const last7 = (checkIns ?? []).slice(-7);
    if (!last7.length) return {} as WeeklyFeedbackForm;
    const avg = (pick: (checkIn: (typeof last7)[number]) => number) =>
      last7.reduce((sum, checkIn) => sum + pick(checkIn), 0) / last7.length;
    return {
      step_count: String(Math.round(avg((checkIn) => checkIn.daily_steps ?? 0)) || ''),
      water_intake: (
        Math.round(avg((checkIn) => num(checkIn.water_liters)) * 10) / 10 || ''
      ).toString(),
      stress_level: String(Math.round(avg((checkIn) => checkIn.stress_level ?? 0)) || ''),
    };
  }, [checkIns]);

  const latestPrefillRef = useRef(prefill);
  useLayoutEffect(() => {
    latestPrefillRef.current = prefill;
  }, [prefill]);

  useLayoutEffect(() => {
    activeFlowIdentityRef.current = flowIdentity;
    pendingExitActionRef.current = null;
    setStarted(false);
    setStep(0);
    setForm(emptyWeekly());
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
      const initialPrefill = latestPrefillRef.current;
      if (draft) {
        setForm({ ...emptyWeekly(), ...initialPrefill, ...draft.form });
        setFormOwnerUserId(user.id);
        setStep(draft.step);
        setStarted(true);
        setHasUnsentChanges(true);
      } else {
        setForm({ ...emptyWeekly(), ...initialPrefill });
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
  }, [flowIdentity, loadDraft, user?.id]);

  useEffect(() => {
    if (
      !ownsCurrentForm ||
      !restored ||
      !started ||
      submitted ||
      submissionCommitted ||
      !hasUnsentChanges
    ) {
      return;
    }
    void saveDraft(form, step);
  }, [
    form,
    hasUnsentChanges,
    ownsCurrentForm,
    restored,
    saveDraft,
    started,
    step,
    submissionCommitted,
    submitted,
  ]);

  useEffect(() => {
    if (!started) return;
    const current = WEEKLY_STEPS[step];
    AccessibilityInfo.announceForAccessibility(
      `Step ${step + 1} of ${WEEKLY_STEPS.length}: ${current.title}`,
    );
  }, [started, step]);

  useEffect(() => {
    const pendingExit = pendingExitActionRef.current;
    if (
      !exitReady ||
      hasUnsentChanges ||
      submissionCommitted ||
      !pendingExit ||
      pendingExit.identity !== activeFlowIdentityRef.current
    ) {
      return;
    }
    pendingExitActionRef.current = null;
    navigation.dispatch(pendingExit.action);
  }, [exitReady, hasUnsentChanges, navigation, submissionCommitted]);

  const permitExit = useCallback(
    (action: NavigationAction, identity: typeof flowIdentity) => {
      if (activeFlowIdentityRef.current !== identity) return;
      pendingExitActionRef.current = { action, identity };
      setHasUnsentChanges(false);
      setSubmissionCommitted(false);
      setCleanupPending(false);
      setExitReady((value) => value + 1);
    },
    [],
  );

  usePreventRemove(
    ownsCurrentForm && (hasUnsentChanges || submissionCommitted) && !submitted,
    ({ data }) => {
      const alertIdentity = flowIdentity;
      if (submissionCommitted) {
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
            const saved = await saveDraft(form, step, { immediate: true });
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
    const message = 'Please correct the highlighted fields before continuing.';
    AccessibilityInfo.announceForAccessibility(message);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    requestAnimationFrame(() => {
      const handle = findNodeHandle(errorSummaryRef.current);
      if (handle !== null) AccessibilityInfo.setAccessibilityFocus(handle);
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
    setStep(nextStep);
    setHasUnsentChanges(true);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [flowIdentity, ownsCurrentForm]);

  const continueForward = useCallback(() => {
    if (!validateCurrentStep()) return;
    moveToStep(step + 1);
  }, [moveToStep, step, validateCurrentStep]);

  const updateField = useCallback((key: string, value: string) => {
    if (!ownsCurrentForm || activeFlowIdentityRef.current !== flowIdentity) return;
    setForm((previous) => ({ ...previous, [key]: value }));
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
  }, [clearDraft, flowIdentity, showSubmissionSuccess]);

  const submit = useCallback(async () => {
    if (!user?.id || !validateCurrentStep()) return;
    const submissionIdentity = flowIdentity;
    const submissionUserId = user.id;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { error } = await supabase.from('weekly_check_ins').insert({
        user_id: submissionUserId,
        ...form,
      });
      if (error) throw error;

      const isCurrent = activeFlowIdentityRef.current === submissionIdentity;
      if (isCurrent) {
        setSubmissionCommitted(true);
        setHasUnsentChanges(false);
        void queryClient.invalidateQueries({ queryKey: ['weeklyCheckIns', submissionUserId] });
      }

      const cleared = await clearDraft();
      if (activeFlowIdentityRef.current !== submissionIdentity) return;
      if (!cleared) {
        setCleanupPending(true);
        setSubmitError('Check-in sent, but its saved draft could not be cleared from this device.');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      setHasUnsentChanges(false);
      showSubmissionSuccess(submissionIdentity);
    } catch {
      if (activeFlowIdentityRef.current !== submissionIdentity) return;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSubmitError("Couldn’t submit. Your answers are still here — check your connection and retry.");
    } finally {
      if (activeFlowIdentityRef.current === submissionIdentity) setSubmitting(false);
    }
  }, [clearDraft, flowIdentity, form, queryClient, showSubmissionSuccess, user?.id, validateCurrentStep]);

  if (submitted) {
    return (
      <Screen>
        <View style={{ gap: spacing.lg, paddingTop: spacing.xl, alignItems: 'center' }}>
          <CheckCircle2 size={iconSize.xl} color={colors.success} strokeWidth={2} accessible={false} />
          <Text variant="h1">{`Thanks, ${firstName}!`}</Text>
          <Card style={{ gap: spacing.md }}>
            <CoachBadge caption="Sent to" />
            <Text variant="bodySm" tone="muted">
              Also upload your weigh-ins, measurements and progress pictures so your coach has the
              full picture. You&apos;ll get detailed feedback within 48 hours.
            </Text>
            <Button
              label="Add measurements"
              variant="secondary"
              icon={<Ruler size={iconSize.md} color={colors.primary} strokeWidth={2} />}
              onPress={() => router.replace('/(app)/measurements')}
            />
            <Button
              label="Add progress photos"
              variant="secondary"
              icon={<Camera size={iconSize.md} color={colors.primary} strokeWidth={2} />}
              onPress={() => router.replace('/(app)/media')}
            />
          </Card>
          <Button label="Done" onPress={() => router.back()} style={{ alignSelf: 'stretch' }} />
        </View>
      </Screen>
    );
  }

  if (
    isLoading ||
    !restored ||
    Boolean(user?.id && !ownsCurrentForm)
  ) {
    return (
      <Screen>
        <PageHeader title="Weekly check-in" onBack={() => router.back()} />
        <View
          testID="progress-skeleton"
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Loading weekly check-in"
          accessibilityState={{ busy: true }}
          style={{ gap: spacing.base }}
        >
          <SkeletonCard lines={3} />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </View>
      </Screen>
    );
  }

  if (submissionCommitted) {
    return (
      <View style={{ flex: 1 }}>
        <Screen archetype="editor">
          <View style={{ gap: spacing.lg }}>
            <PageHeader title="Weekly check-in" onBack={() => router.back()} />
            <Card style={{ gap: spacing.md }}>
              <Text variant="h2">Your check-in was sent</Text>
              <Text
                variant="bodySm"
                tone="primary"
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                {submitError ??
                  'Check-in sent, but its saved draft could not be cleared from this device.'}
              </Text>
              <Text variant="bodySm" tone="muted">
                Retry removes only the local draft. It will not submit your answers again.
              </Text>
            </Card>
          </View>
        </Screen>
        <StickyActionBar
          status={<StatusPill status={cleanupPending ? 'error' : 'saving'} />}
          primaryLabel="Retry cleanup"
          onPrimary={() => void retryCleanup()}
          primaryLoading={submitting}
        />
      </View>
    );
  }

  if (!started) {
    const header = (
      <View style={{ gap: spacing.lg, paddingBottom: history?.length ? spacing.sm : spacing.xl }}>
        <PageHeader title="Weekly check-in" onBack={() => router.back()} />
        <Card style={{ gap: spacing.md }}>
          <Text variant="h2">Hi {firstName}! 👋</Text>
          <Text variant="bodySm" tone="muted">
            Ready for your Week {weekNumber} check-in? It takes a few minutes, and your coach reads
            every word.
          </Text>
          <Button
            label="Start"
            onPress={() => {
              setStarted(true);
              setHasUnsentChanges(true);
            }}
          />
        </Card>
        {history?.length ? <Text variant="h2">Past check-ins</Text> : null}
        {history?.length && isError ? (
          <ErrorState
            title="Past check-ins couldn’t refresh"
            message="Your saved history is still shown below. Retry when you’re connected."
            onRetry={() => void refetch()}
          />
        ) : null}
      </View>
    );

    return (
      <Screen scroll={false}>
        <AnimatedFlatList
          data={history ?? []}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          renderItem={({ item, index }) => (
            <WeeklyFeedbackHistoryCard
              item={item}
              weekNumber={(history?.length ?? 1) - index}
            />
          )}
          ListEmptyComponent={
            isError ? (
              <ErrorState
                title="Past check-ins didn’t load"
                message="You can still start this week’s check-in, or retry your history."
                onRetry={() => void refetch()}
              />
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="No submitted check-ins yet"
                message="Your submitted weekly check-ins will appear here for easy review."
              />
            )
          }
          initialNumToRender={6}
          windowSize={5}
          itemLayoutAnimation={listMotion.itemLayoutAnimation}
          showsVerticalScrollIndicator={false}
        />
      </Screen>
    );
  }

  const current = WEEKLY_STEPS[step];
  const primaryLabel =
    step === WEEKLY_STEPS.length - 1 ? (submitError ? 'Retry' : 'Submit') : 'Next';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen ref={scrollRef} archetype="editor">
        <View style={{ gap: spacing.lg }}>
          <PageHeader title="Weekly check-in" onBack={() => router.back()} />

          <View style={{ gap: spacing.xs }}>
            <Text variant="h1">{current.title}</Text>
            <Text variant="bodySm" tone="muted">
              {current.description}
            </Text>
          </View>

          {Object.keys(errors).length ? (
            <View
              ref={errorSummaryRef}
              accessible
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={{ gap: spacing.xs }}
            >
              <Text variant="bodySm" tone="primary">
                Please correct the highlighted fields before continuing.
              </Text>
            </View>
          ) : null}

          <ProgressBar
            value={(step + 1) / WEEKLY_STEPS.length}
            accessibilityLabel={`Step ${step + 1} of ${WEEKLY_STEPS.length}`}
          />

          <Card style={{ gap: spacing.lg }}>
            {current.fields.map((field) => {
              const value = form[field.key] ?? '';
              const setValue = (nextValue: string) => updateField(field.key, nextValue);

              if (field.type === 'radio') {
                return (
                  <View key={field.key} style={{ gap: spacing.sm }}>
                    <Text variant="label" tone="muted">
                      {field.label}
                    </Text>
                    {(field.options ?? []).map((option) => (
                      <OptionRow
                        key={option}
                        label={option}
                        selected={value === option}
                        onPress={() => setValue(option)}
                      />
                    ))}
                    {errors[field.key] ? (
                      <Text variant="bodySm" tone="primary" accessibilityLiveRegion="polite">
                        {errors[field.key]}
                      </Text>
                    ) : null}
                  </View>
                );
              }

              if (field.type === 'scale') {
                return (
                  <View key={field.key} style={{ gap: spacing.sm }}>
                    <Text variant="label" tone="muted">
                      {field.label}
                    </Text>
                    <RatingRow
                      label={field.label}
                      min={1}
                      max={10}
                      value={value ? Number(value) : null}
                      onChange={(number) => setValue(String(number))}
                    />
                    {errors[field.key] ? (
                      <Text variant="bodySm" tone="primary" accessibilityLiveRegion="polite">
                        {errors[field.key]}
                      </Text>
                    ) : null}
                  </View>
                );
              }

              const multiline = field.type === 'textarea';
              return (
                <Input
                  key={field.key}
                  label={field.label}
                  value={value}
                  onChangeText={setValue}
                  error={errors[field.key]}
                  multiline={multiline}
                  numberOfLines={multiline ? 4 : 1}
                  inputStyle={multiline ? { minHeight: 96, textAlignVertical: 'top' } : undefined}
                  keyboardType={field.type === 'number' ? 'decimal-pad' : 'default'}
                  hint={field.prefill ? 'Prefilled from your daily check-ins — edit if needed' : undefined}
                />
              );
            })}
          </Card>

          {submitError ? (
            <Text
              variant="bodySm"
              tone="primary"
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              {submitError}
            </Text>
          ) : null}
          {exitError ? (
            <Text
              variant="bodySm"
              tone="primary"
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              {exitError}
            </Text>
          ) : null}
        </View>
      </Screen>

      <StickyActionBar
        status={
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: spacing.sm,
            }}
          >
            <Text variant="bodySm" tone="muted">
              {`Step ${step + 1} of ${WEEKLY_STEPS.length}`}
            </Text>
            <StatusPill status={draftStatus} />
          </View>
        }
        secondaryLabel={step > 0 ? 'Back' : undefined}
        onSecondary={step > 0 ? () => moveToStep(step - 1) : undefined}
        primaryLabel={primaryLabel}
        onPrimary={step === WEEKLY_STEPS.length - 1 ? () => void submit() : continueForward}
        primaryLoading={submitting}
      />
    </KeyboardAvoidingView>
  );
}
