import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, findNodeHandle, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Celebration } from '@/components/checkin/Celebration';
import {
  CheckInForm,
  EMPTY_FORM,
  SameAsYesterdayChip,
  fromRow,
  prefillFrom,
  toPayload,
  type CheckInStep,
  type FormState,
} from '@/components/checkin/CheckInForm';
import {
  Button,
  Card,
  ErrorState,
  ProgressBar,
  Screen,
  SkeletonCard,
  StickyActionBar,
  Text,
} from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckInDraft } from '@/hooks/useCheckInDraft';
import { findPreviousCheckIn, useCheckInMutation } from '@/hooks/useCheckInMutation';
import { useDashboardData } from '@/hooks/useDashboardData';
import { localDateString, parseLocalDate } from '@/lib/dates';
import { validateCheckInStep } from '@/lib/checkin-validation';
import { calculateStreak } from '@/lib/streak';
import { num, normalizeWorkoutStatus } from '@/types/db';
import { ACTION_BAR_HEIGHT, spacing, useMotion } from '@/theme';

const CHECK_IN_STEPS: { key: CheckInStep; title: string; description: string }[] = [
  {
    key: 'readiness',
    title: 'Readiness and energy',
    description: 'A quick picture of how you are starting today.',
  },
  {
    key: 'recovery',
    title: 'Sleep and recovery',
    description: 'Capture sleep and the context that affects recovery.',
  },
  {
    key: 'adherence',
    title: 'Nutrition and adherence',
    description: 'Record training and the useful nutrition numbers.',
  },
  {
    key: 'finish',
    title: 'Notes and confirmation',
    description: 'Review your check-in before saving it.',
  },
];

export default function CheckInScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const motion = useMotion();
  const scrollRef = useRef<ScrollView>(null);
  const errorSummaryRef = useRef<View>(null);
  const params = useLocalSearchParams<{ date?: string }>();

  const { checkIns, processed, isLoading, isError, refetch } = useDashboardData();
  const mutation = useCheckInMutation();

  const today = localDateString();
  // A date param (from the week strip) backfills a past day; capped at today.
  const targetDate = params.date && params.date <= today ? params.date : today;
  const isToday = targetDate === today;

  const existing = useMemo(
    () => checkIns?.find((c) => c.date === targetDate) ?? null,
    [checkIns, targetDate],
  );
  const previous = useMemo(
    () => findPreviousCheckIn(checkIns, targetDate),
    [checkIns, targetDate],
  );

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editing, setEditing] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [draftReady, setDraftReady] = useState(false);
  const [celebrating, setCelebrating] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const { saveDraft, loadDraft, clearDraft } = useCheckInDraft(user?.id, targetDate);

  // Existing data wins. New check-ins restore a recent local draft, but never
  // silently copy yesterday's subjective answers.
  useEffect(() => {
    let active = true;
    setDraftReady(false);
    void (async () => {
      if (existing) {
        if (!active) return;
        setForm(fromRow(existing));
        setStepIndex(0);
      } else {
        const draft = await loadDraft();
        if (!active) return;
        setForm(draft?.form ?? EMPTY_FORM);
        setStepIndex(Math.min(CHECK_IN_STEPS.length - 1, Math.max(0, draft?.step ?? 0)));
      }
      setEditing(false);
      setErrors({});
      setDraftReady(true);
    })();
    return () => {
      active = false;
    };
  }, [existing, loadDraft, targetDate]);

  useEffect(() => {
    if (draftReady && !existing) saveDraft(form, stepIndex);
  }, [draftReady, existing, form, saveDraft, stepIndex]);

  const streak = useMemo(() => calculateStreak(processed), [processed]);

  const payoffLine = useMemo(() => {
    const nextStreak = existing ? streak : streak + 1;
    if (nextStreak > 1) return `🔥 ${nextStreak}-day streak`;
    const sorted = [...(checkIns ?? [])].sort((a, b) => (a.date < b.date ? -1 : 1));
    const first = sorted[0];
    if (first && form.morningWeight) {
      const delta = num(first.morning_weight) - form.morningWeight;
      if (Math.abs(delta) >= 0.1) {
        return `${delta > 0 ? '↓' : '↑'}${Math.abs(delta).toFixed(1)} kg since day 1`;
      }
    }
    return 'Logged. Your coach sees this.';
  }, [existing, streak, checkIns, form.morningWeight]);

  const submit = async () => {
    const nextErrors = validateCheckInStep(activeStep.key, form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      AccessibilityInfo.announceForAccessibility('Please complete the highlighted fields.');
      requestAnimationFrame(() => {
        const node = findNodeHandle(errorSummaryRef.current);
        if (node) AccessibilityInfo.setAccessibilityFocus(node);
      });
      return;
    }
    setErrors({});
    setSaveError(null);
    try {
      await mutation.mutateAsync(toPayload(form, targetDate));
      await clearDraft();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCelebrating(payoffLine);
      AccessibilityInfo.announceForAccessibility(`Check-in saved. ${payoffLine}`);
      setTimeout(() => setCelebrating(null), 2200);
      setEditing(false);
      setStepIndex(0);
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSaveError("Couldn't save your check-in. Check your connection and try again.");
    }
  };

  if (isLoading) {
    return (
      <Screen archetype="root">
        <View style={{ gap: spacing.base }}>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={3} />
        </View>
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

  if (celebrating) {
    return (
      <Screen archetype="root">
        <Celebration payoff={celebrating} />
      </Screen>
    );
  }

  const dateLabel = isToday
    ? 'Today'
    : format(parseLocalDate(targetDate), 'EEEE d MMMM');
  const activeStep = CHECK_IN_STEPS[stepIndex];
  const isLastStep = stepIndex === CHECK_IN_STEPS.length - 1;

  const moveToStep = (next: number) => {
    const bounded = Math.min(CHECK_IN_STEPS.length - 1, Math.max(0, next));
    if (bounded > stepIndex) {
      const nextErrors = validateCheckInStep(activeStep.key, form);
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        AccessibilityInfo.announceForAccessibility('Please complete the highlighted fields.');
        requestAnimationFrame(() => {
          const node = findNodeHandle(errorSummaryRef.current);
          if (node) AccessibilityInfo.setAccessibilityFocus(node);
        });
        return;
      }
    }
    setStepIndex(bounded);
    setErrors({});
    setSaveError(null);
    scrollRef.current?.scrollTo({ y: 0, animated: motion.enabled });
    AccessibilityInfo.announceForAccessibility(
      `Step ${bounded + 1} of ${CHECK_IN_STEPS.length}: ${CHECK_IN_STEPS[bounded].title}`,
    );
  };

  // ── already checked in: summary + edit ───────────────────────────────────
  if (existing && !editing) {
    const f = fromRow(existing);
    const status = normalizeWorkoutStatus(f.workoutStatus);
    const rows: [string, string][] = [
      ['Weight', f.morningWeight ? `${f.morningWeight} kg` : '—'],
      ['Sleep', f.sleepHours ? `${f.sleepHours} h` : '—'],
      ['Workout', status === 'done' ? 'Done' : status === 'cardio' ? 'Cardio' : status === 'rest' ? 'Rest' : 'No'],
      ['Nutrition', f.nutritionScore ? `${f.nutritionScore}/10` : '—'],
      ['Energy', f.energyLevel ? `${f.energyLevel}/10` : '—'],
      ['Steps', f.dailySteps ? f.dailySteps.toLocaleString() : '—'],
    ];

    return (
      <Screen archetype="root">
        <View style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.xs }}>
            <Text variant="h1">{dateLabel} is done</Text>
            <Text variant="bodySm" tone="muted">
              {streak > 1 ? `🔥 ${streak}-day streak` : 'Nice work.'}
            </Text>
          </View>

          <Card style={{ gap: spacing.md }}>
            {rows.map(([label, value]) => (
              <View
                key={label}
                style={{ flexDirection: 'row', justifyContent: 'space-between' }}
              >
                <Text variant="bodySm" tone="muted">
                  {label}
                </Text>
                <Text variant="bodySm" numeric>
                  {value}
                </Text>
              </View>
            ))}
          </Card>

          <Button
            label={`Edit ${isToday ? 'today' : 'this day'}`}
            variant="secondary"
            onPress={() => {
              setStepIndex(0);
              setErrors({});
              setEditing(true);
            }}
          />
          {!isToday ? (
            <Button
              label="Back to today"
              variant="ghost"
              onPress={() => router.setParams({ date: undefined })}
            />
          ) : null}
        </View>
      </Screen>
    );
  }

  // ── the fast flow ────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen ref={scrollRef} archetype="root" bottomInset={ACTION_BAR_HEIGHT}>
        <View style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.sm }}>
            <Text variant="h1">{isToday ? 'How was today?' : dateLabel}</Text>
            <Text variant="bodySm" tone="muted">
              {streak > 0
                ? `🔥 ${streak}-day streak — keep it going.`
                : "Welcome back — today's a fresh start."}
            </Text>
            <ProgressBar
              value={(stepIndex + 1) / CHECK_IN_STEPS.length}
              glow={false}
              accessibilityLabel={`Check-in step ${stepIndex + 1} of ${CHECK_IN_STEPS.length}`}
            />
            <View style={{ gap: spacing.xs }}>
              <Text variant="h2">{activeStep.title}</Text>
              <Text variant="bodySm" tone="muted">
                {activeStep.description}
              </Text>
            </View>
            {stepIndex === 0 && previous && !existing ? (
              <SameAsYesterdayChip
                previous={previous}
                onApply={() => setForm((p) => ({ ...p, ...prefillFrom(previous) }))}
              />
            ) : null}
            {Object.keys(errors).length > 0 ? (
              <View
                ref={errorSummaryRef}
                accessible
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={{ gap: spacing.xs }}
              >
                <Text variant="bodySm" tone="primary">
                  Please complete the highlighted fields.
                </Text>
              </View>
            ) : null}
          </View>

          <CheckInForm
            form={form}
            setForm={setForm}
            previous={previous}
            step={activeStep.key}
            errors={errors}
          />

          {saveError ? (
            <Text variant="bodySm" tone="primary" accessibilityLiveRegion="polite">
              {saveError}
            </Text>
          ) : null}
        </View>
      </Screen>

      <StickyActionBar
        status={`Step ${stepIndex + 1} of ${CHECK_IN_STEPS.length}${existing ? '' : ' · Draft saves on this device'}`}
        secondaryLabel={stepIndex > 0 ? 'Back' : existing ? 'Cancel' : undefined}
        onSecondary={
          stepIndex > 0
            ? () => moveToStep(stepIndex - 1)
            : existing
              ? () => setEditing(false)
              : undefined
        }
        primaryLabel={isLastStep ? (existing ? 'Save changes' : 'Submit check-in') : 'Continue'}
        onPrimary={isLastStep ? submit : () => moveToStep(stepIndex + 1)}
        primaryLoading={mutation.isPending}
      />
    </KeyboardAvoidingView>
  );
}
