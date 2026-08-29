import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { CalendarCheck, Check, Clock, Dumbbell, Flame, Play, Trophy } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';

import { Logo } from '@/components/brand';
import { TimezonePicker } from '@/components/onboarding/TimezonePicker';
import { VideoStep } from '@/components/onboarding/VideoStep';
import { Button, Card, ProgressBar, Screen, SegmentedControl, Text, type Segment } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/hooks/useOnboarding';
import { supabase } from '@/lib/supabase';
import { detectTimezone } from '@/lib/timezones';
import { iconSize, spacing, useTheme } from '@/theme';

const TOTAL_STEPS = 3;
type PrimaryGoal = 'fat_loss' | 'muscle_gain' | 'performance' | 'consistency';

const GOALS: Segment<PrimaryGoal>[] = [
  { value: 'fat_loss', label: 'Fat loss', icon: Flame },
  { value: 'muscle_gain', label: 'Build muscle', icon: Dumbbell },
  { value: 'performance', label: 'Performance', icon: Trophy },
  { value: 'consistency', label: 'Consistency', icon: CalendarCheck },
];

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { step, updateStep, isUpdating } = useOnboarding();

  const [localStep, setLocalStep] = useState(step);
  const [timezone, setTimezone] = useState(detectTimezone());
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [tzOpen, setTzOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => setLocalStep(step), [step]);
  useEffect(() => setShowVideo(false), [localStep]);

  const updateProfileData = async (patch: Record<string, unknown>) => {
    if (!user?.id) return;
    const { data, error: readError } = await supabase
      .from('users')
      .select('profile_data')
      .eq('id', user.id)
      .single();
    if (readError) throw readError;
    const existing = (data?.profile_data ?? {}) as Record<string, unknown>;
    const { error } = await supabase
      .from('users')
      .update({ profile_data: { ...existing, ...patch } })
      .eq('id', user.id);
    if (error) throw error;
  };

  const goNext = async () => {
    setSaveError(null);
    setSavingProfile(true);
    const next = localStep + 1;
    setLocalStep(next); // optimistic, matching the web
    try {
      if (localStep === 0 && primaryGoal) {
        await updateProfileData({ primary_goal: primaryGoal });
      }
      await updateStep(next);
    } catch {
      setLocalStep(localStep);
      setSaveError("Couldn't save your progress. Check your connection and try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const goBack = async () => {
    const previous = Math.max(0, localStep - 1);
    setSaveError(null);
    setSavingProfile(true);
    setLocalStep(previous);
    try {
      await updateStep(previous);
    } catch {
      setLocalStep(localStep);
      setSaveError("Couldn't save your progress. Check your connection and try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const finish = async () => {
    setSaveError(null);
    setSavingProfile(true);
    try {
      if (user?.id) {
        await updateProfileData({
          timezone,
          ...(primaryGoal ? { primary_goal: primaryGoal } : {}),
        });
      }
      await updateStep(3);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      AccessibilityInfo.announceForAccessibility("You're all set. Opening your dashboard.");
      router.replace('/(app)/(tabs)');
    } catch {
      setSaveError("Couldn't finish setup. Check your connection and try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const titles = ['What are you working toward?', 'Your weekly rhythm', "You're all set"];
  const subtitles = [
    'Choose the outcome that matters most right now.',
    'A simple loop keeps your plan useful and personal.',
    'Confirm when reminders should reach you.',
  ];

  return (
    <Screen>
      <View style={{ alignItems: 'center', paddingTop: spacing.base }}>
        <Logo variant="wordmark" size={132} />
      </View>

      <View style={{ gap: spacing.sm, paddingTop: spacing.lg }}>
        <Text variant="label" tone="muted">
          Step {Math.min(localStep + 1, TOTAL_STEPS)} of {TOTAL_STEPS}
        </Text>
        <ProgressBar
          value={(localStep + 1) / TOTAL_STEPS}
          accessibilityLabel={`Onboarding progress, step ${localStep + 1} of ${TOTAL_STEPS}`}
        />
      </View>

      <View style={{ gap: spacing.xs, marginTop: spacing.lg }}>
        <Text variant="h1">{titles[localStep] ?? titles[2]}</Text>
        <Text variant="bodySm" tone="muted">
          {subtitles[localStep] ?? subtitles[2]}
        </Text>
      </View>

      <View style={{ marginTop: spacing.lg, gap: spacing.lg }}>
        {localStep === 0 ? (
          <>
            <Card style={{ gap: spacing.base }}>
              <SegmentedControl
                label="Primary goal"
                large
                segments={GOALS}
                value={primaryGoal}
                onChange={setPrimaryGoal}
              />
              <Text variant="bodySm" tone="muted">
                Your coach can adjust this with you later.
              </Text>
            </Card>
            <Pressable
              onPress={() => setShowVideo((shown) => !shown)}
              accessibilityRole="button"
              accessibilityState={{ expanded: showVideo }}
              style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
            >
              <Play size={iconSize.sm} color={colors.primary} strokeWidth={2} accessible={false} />
              <Text variant="bodySm" tone="primary">
                {showVideo ? 'Hide introduction' : 'Watch introduction (optional)'}
              </Text>
            </Pressable>
            {showVideo ? <VideoStep videoId="QX3_LQxnMXI" title="Dawnage introduction" /> : null}
          </>
        ) : null}
        {localStep === 1 ? (
          <>
            <Card style={{ gap: spacing.base }}>
              {[
                ['Check in daily', 'A few focused answers keep your coach informed.'],
                ['Follow your plan', 'Training and nutrition stay together in one place.'],
                ['Review each week', 'Trends turn daily effort into useful decisions.'],
              ].map(([title, description]) => (
                <View key={title} style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Check size={iconSize.sm} color={colors.success} strokeWidth={2.5} accessible={false} />
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <Text variant="h2">{title}</Text>
                    <Text variant="bodySm" tone="muted">{description}</Text>
                  </View>
                </View>
              ))}
            </Card>
            <Pressable
              onPress={() => setShowVideo((shown) => !shown)}
              accessibilityRole="button"
              accessibilityState={{ expanded: showVideo }}
              style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
            >
              <Play size={iconSize.sm} color={colors.primary} strokeWidth={2} accessible={false} />
              <Text variant="bodySm" tone="primary">
                {showVideo ? 'Hide walkthrough' : 'Watch how it works (optional)'}
              </Text>
            </Pressable>
            {showVideo ? <VideoStep videoId="zmyQxmksUuc" title="How Dawnage works" /> : null}
          </>
        ) : null}

        {localStep >= 2 ? (
          <Card style={{ gap: spacing.base }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Clock size={iconSize.md} color={colors.primary} strokeWidth={2} accessible={false} />
              <Text variant="h2">Your timezone</Text>
            </View>

            {/* Detected value is presented as a confirmation, not a question. */}
            <Text variant="bodySm" tone="muted">
              We&apos;ll use this to time your reminders.
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text variant="h2" style={{ flex: 1 }}>
                {timezone.replace(/_/g, ' ')}
              </Text>
              <Pressable
                onPress={() => setTzOpen(true)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Change timezone"
                style={{ minHeight: 32, justifyContent: 'center' }}
              >
                <Text tone="primary">Change</Text>
              </Pressable>
            </View>

            <Text variant="bodySm" tone="muted">
              Your detailed assessment lives in Profile — you can fill it in any time.
            </Text>
          </Card>
        ) : null}

        {saveError ? (
          <Text variant="bodySm" tone="primary" accessibilityLiveRegion="polite">
            {saveError}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {localStep > 0 ? (
            <Button
              label="Back"
              variant="secondary"
              onPress={() => void goBack()}
              disabled={isUpdating || savingProfile}
              style={{ flex: 1 }}
            />
          ) : null}
          <Button
            label={localStep >= 2 ? 'Finish setup' : 'Continue'}
            loading={isUpdating || savingProfile}
            onPress={localStep >= 2 ? finish : goNext}
            disabled={localStep === 0 && !primaryGoal}
            accessibilityHint={localStep === 0 && !primaryGoal ? 'Choose a primary goal first' : undefined}
            icon={
              localStep >= 2 ? (
                <Check size={iconSize.md} color={colors.onPrimary} strokeWidth={2.5} />
              ) : undefined
            }
            style={{ flex: localStep > 0 ? 1.5 : 1 }}
          />
        </View>
      </View>

      <TimezonePicker
        visible={tzOpen}
        onClose={() => setTzOpen(false)}
        selected={timezone}
        onSelect={setTimezone}
      />
    </Screen>
  );
}
