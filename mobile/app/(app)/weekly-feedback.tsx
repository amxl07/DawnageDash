import { useRouter } from 'expo-router';
import { Camera, CheckCircle2, Ruler } from 'lucide-react-native';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { CoachBadge } from '@/components/coach/CoachBadge';
import {
  AnimatedFlatList, Button, Card, EmptyState, ErrorState, Input, OptionRow,
  PageHeader, ProgressBar, RatingRow, Screen, SkeletonCard, StatusPill,
  StickyActionBar, Text, useListMotion,
} from '@/components/ui';
import { MotionReveal } from '@/components/ui/MotionReveal';
import { WEEKLY_STEPS } from '@/components/weekly/steps';
import { WeeklyFeedbackAnswers, WeeklyFeedbackHistoryCard } from '@/features/weekly/WeeklyFeedbackHistoryCard';
import { useWeeklyFeedbackController } from '@/features/weekly/useWeeklyFeedbackController';
import { weeklyObservationHint } from '@/features/weekly/selectors';
import { iconSize, spacing, useTheme } from '@/theme';

export { focusWeeklyTarget } from '@/features/weekly/useWeeklyFeedbackController';

export default function WeeklyFeedbackScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const listMotion = useListMotion();
  const {
    user, firstName, submitted, isLoading, restored, ownsCurrentForm,
    submissionCommitted, submitError, cleanupPending, retryCleanup, submitting,
    started, weekNumber, start, history, isError, refetch, step, form, errors,
    scrollRef, errorSummaryRef, stepTitleRef, updateField, exitError, draftStatus,
    moveToStep, submit, continueForward, report, dailyRecordsError, retryDailyRecords,
    conflictingReport, discardConflictingDraft, saveCurrentDraft, historyReady, inferredReportDate,
  } = useWeeklyFeedbackController();

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

  if (conflictingReport) {
    return (
      <Screen archetype="editor">
        <View style={{ gap: spacing.lg }}>
          <PageHeader title="Weekly check-in" onBack={() => router.back()} />
          <Card style={{ gap: spacing.md }}>
            <Text variant="h2">Review saved draft</Text>
            <Text variant="bodySm">A report for this reporting week was already submitted. This draft has different answers, so sending it again is paused. Your saved answers have been kept.</Text>
            <Text variant="bodySm" tone="muted">{`Draft reporting window: ${report.label}`}</Text>
            {inferredReportDate ? <Text variant="bodySm" tone="muted">This older draft did not store its original reporting dates. Review the displayed week; your answers are unchanged.</Text> : null}
            <Button label="Keep draft and exit" variant="secondary" onPress={() => router.back()} />
            <Button label="Discard saved draft" variant="destructive" onPress={discardConflictingDraft} />
            {draftStatus === 'error' ? <>
              <Text variant="bodySm" tone="primary">Newer answers could not be saved on this device. Keep this screen open and retry saving the draft.</Text>
              <Button label="Retry saving draft" onPress={() => void saveCurrentDraft()} />
            </> : null}
            {exitError ? <Text variant="bodySm" tone="primary" accessibilityRole="alert">{exitError}</Text> : null}
          </Card>
          <Card style={{ gap: spacing.md }}>
            <Text variant="h2">Saved draft answers</Text>
            <WeeklyFeedbackAnswers answers={form} />
          </Card>
          <Card style={{ gap: spacing.md }}>
            <Text variant="h2">Submitted answers</Text>
            <WeeklyFeedbackAnswers answers={conflictingReport.form} />
          </Card>
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
          status={<StatusPill status={submitting ? 'saving' : cleanupPending ? 'error' : 'saved'} label={submitting ? 'Clearing saved draft…' : 'Report sent · draft still on device'} />}
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
            onPress={start}
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

          <MotionReveal revision={step} style={{ gap: spacing.lg }} testID="weekly-step-content">
            <View style={{ gap: spacing.xs }}>
              <View
                ref={stepTitleRef}
                testID="weekly-step-title"
                accessible
                focusable
                accessibilityRole="header"
              >
                <Text variant="h1" accessibilityElementsHidden>
                  {current.title}
                </Text>
              </View>
              <Text variant="bodySm" tone="muted">
                {current.description}
              </Text>
            </View>

            {Object.keys(errors).length ? (
              <View
                ref={errorSummaryRef}
                accessible
                focusable
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={{ gap: spacing.xs }}
              >
                <Text variant="bodySm" tone="primary">
                  Please correct the highlighted fields before continuing.
                </Text>
              </View>
            ) : null}

            <Text variant="bodySm" tone="muted">
              {`Daily-record window: ${report.label} · device local dates. Only recorded values are averaged.`}
            </Text>

            {inferredReportDate ? <Text variant="bodySm" tone="muted">This older draft did not store its original reporting dates. Review the displayed week before submitting; your answers are unchanged.</Text> : null}
            {!historyReady ? <ErrorState title="Check submitted reports before sending" message="You can keep editing. Retry history before sending to avoid submitting this report twice." onRetry={() => void refetch()} retryLabel="Retry submitted history" /> : null}
            {dailyRecordsError ? <ErrorState title="Daily records couldn’t refresh" message="Your answers are still here. Review them or retry your daily records." onRetry={() => void retryDailyRecords()} /> : null}

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
                    <Text variant="bodySm" tone="muted">{weeklyObservationHint(report, field.key)}</Text>
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
                  hint={field.prefill ? weeklyObservationHint(report, field.key) : undefined}
                />
              );
            })}
            </Card>
          </MotionReveal>

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
