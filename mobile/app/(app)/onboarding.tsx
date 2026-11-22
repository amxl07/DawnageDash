import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  findNodeHandle,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';

import { Logo } from '@/components/brand';
import { TimezonePicker } from '@/components/onboarding/TimezonePicker';
import { Button, ProgressBar, Screen, SkeletonCard, StickyActionBar, Text } from '@/components/ui';
import { MotionReveal } from '@/components/ui/MotionReveal';
import { SetupStage } from '@/features/onboarding/SetupStage';
import { useSetupController } from '@/features/onboarding/useSetupController';
import { setupDestination } from '@/features/onboarding/setup-model';
import { CheckInGuideSheet } from '@/features/program/CheckInGuideSheet';
import { spacing, useTheme } from '@/theme';

const titles = ['Make this\nyour beginning.', 'A little each day.\nA clearer way forward.', 'Your Day 1.\nWhen you’re ready.'];
const subtitles = ['Choose a focus. Your coach will help shape the plan.', 'Two simple habits, with your coach alongside you.', 'Your first submitted check-in starts your program. You choose when to begin.'];

type FocusTarget = View & { focus?: () => void };

function focusSetupTitle(target: FocusTarget | null) {
  if (!target) return;
  if (Platform.OS === 'web') {
    if (typeof target.focus === 'function') target.focus();
    return;
  }
  try {
    const handle = findNodeHandle(target);
    if (handle !== null) AccessibilityInfo.setAccessibilityFocus(handle);
  } catch {
    // The stage may be replaced before accessibility focus is applied.
  }
}

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const setup = useSetupController();
  const [footerHeight, setFooterHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const titleRef = useRef<View>(null);
  const [timezoneOpen, setTimezoneOpen] = useState(false);
  const timezoneTriggerRef = useRef<View>(null);
  const [showGuide, setShowGuide] = useState(false);
  const guideTriggerRef = useRef<View>(null);
  useEffect(() => { setShowGuide(false); }, [setup.stage]);
  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    focusSetupTitle(titleRef.current as FocusTarget | null);
  }, [setup.stage]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => { if (state !== 'active') setShowGuide(false); });
    return () => subscription.remove();
  }, []);
  const next = async () => {
    const finalStage = setup.stage === 2;
    if (await setup.continue() && finalStage) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      AccessibilityInfo.announceForAccessibility(setup.values.startPreference === 'start_now' ? 'Setup saved. Let’s begin your first check-in.' : 'Setup saved. You can wait for your coach on Home.');
      router.replace(setupDestination(setup.values.startPreference));
    }
  };
  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <Screen ref={scrollRef} archetype="editor" footerHeight={footerHeight} testID="setup-screen">
      <View style={{ gap: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.base }}>
          <Logo variant="wordmark" size={118} />
          <Text variant="bodySm" tone="muted">{setup.stage + 1} of 3</Text>
        </View>
        <ProgressBar value={(setup.stage + 1) / 3} accessibilityLabel={'Setup, step ' + (setup.stage + 1) + ' of 3'} />
        <MotionReveal revision={setup.stage} style={{ gap: spacing.lg }} testID="setup-stage-content">
          <View style={{ gap: spacing.md }}>
            <View
              ref={titleRef}
              testID="setup-stage-title"
              accessible
              focusable
              accessibilityRole="header"
            >
              <Text variant="display" accessibilityElementsHidden style={{ letterSpacing: -0.8 }}>
                {titles[setup.stage]}
              </Text>
            </View>
            <Text variant="body" tone="muted">{subtitles[setup.stage]}</Text>
          </View>
          {setup.loadError ? <View style={{ gap: spacing.base }}>
            <Text tone="muted">We couldn’t load your saved choices.</Text><Button label="Try again" onPress={setup.retry} />
          </View> : setup.loading ? <SkeletonCard lines={4} /> : <>
            <SetupStage stage={setup.stage} values={setup.values} disabled={setup.isSaving} onGoal={setup.setGoal} onTimezone={() => setTimezoneOpen(true)} onEditGoal={setup.editGoal} onStartPreference={setup.setStartPreference} timezoneTriggerRef={timezoneTriggerRef} />
            {setup.stage === 1 ? <View style={{ gap: spacing.md }}>
              <Pressable
                ref={guideTriggerRef}
                onPress={() => setShowGuide(true)}
                accessibilityRole="button"
                accessibilityLabel="Try a practice check-in"
                accessibilityState={{ expanded: showGuide }}
                style={({ pressed }) => ({
                  minHeight: 48,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  backgroundColor: pressed ? colors.pressed : 'transparent',
                })}
              >
                <Text variant="label" tone="primary">Try a practice check-in</Text>
              </Pressable>
            </View> : null}
          </>}
        </MotionReveal>
      </View>
    </Screen>
    <StickyActionBar onHeightChange={setFooterHeight} primaryLabel={setup.stage === 2 ? setup.values.startPreference === 'start_now' ? 'Start my first check-in' : setup.values.startPreference === 'wait_for_coach' ? 'Go to my Home' : 'Choose how to begin' : 'Continue'} primaryTestID="setup-continue" onPrimary={() => { void next(); }}
      primaryLoading={setup.isSaving} primaryDisabled={setup.loading || setup.loadError || !setup.values.primaryGoal || (setup.stage === 2 && !setup.values.startPreference)}
      secondaryLabel={setup.stage > 0 ? 'Back' : undefined} onSecondary={setup.back}
      status={setup.error ? <Text tone="destructive" variant="bodySm" accessibilityLiveRegion="polite">{setup.error}</Text> : undefined} />
    <TimezonePicker visible={timezoneOpen} onClose={() => setTimezoneOpen(false)} selected={setup.values.timezone} onSelect={setup.setTimezone} returnFocusRef={timezoneTriggerRef} />
    <CheckInGuideSheet visible={showGuide} onClose={() => setShowGuide(false)} returnFocusRef={guideTriggerRef} />
  </View>;
}
