import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { addMonths, format } from 'date-fns';
import { useRouter } from 'expo-router';
import { ChevronDown, Clock } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Alert, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CountryPicker, type Country } from '@/components/auth/CountryPicker';
import { TimezonePicker } from '@/components/onboarding/TimezonePicker';
import { CoachBadge } from '@/components/coach/CoachBadge';
import { QuestionnaireWizard } from '@/components/questionnaire';
import {
  Button,
  Card,
  Input,
  PageHeader,
  Screen,
  SegmentedControl,
  SkeletonCard,
  Text,
} from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/usePlans';
import { parseLocalDate } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { detectTimezone } from '@/lib/timezones';
import { HIT_SLOP_MIN, iconSize, radius, spacing, useTheme } from '@/theme';

type Tab = 'basic' | 'assessment';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useUserProfile();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>('basic');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [countryOpen, setCountryOpen] = useState(false);
  const [tzOpen, setTzOpen] = useState(false);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    country: '',
    timezone: detectTimezone(),
    goal: '',
    injuries: '',
    allergies: '',
    workoutDays: '',
    medicalCondition: '',
  });

  useEffect(() => {
    if (!profile || !user?.id) return;
    void (async () => {
      const { data: q } = await supabase
        .from('onboarding_questionnaire')
        .select('answers')
        .eq('user_id', user.id)
        .maybeSingle();
      let answers: Record<string, string> = {};
      try {
        answers = JSON.parse((q?.answers as string) || '{}');
      } catch {
        answers = {};
      }
      const pd = (profile.profile_data ?? {}) as Record<string, string>;
      // Prefer questionnaire answers, fall back to profile_data (web parity).
      setForm({
        name: profile.full_name ?? '',
        phone: profile.phone_number ?? '',
        country: profile.country ?? '',
        timezone: pd.timezone || detectTimezone(),
        goal: answers.q14 || pd.goal || '',
        injuries: answers.q56 || pd.injuries || '',
        allergies: answers.q64 || pd.allergies || '',
        workoutDays: answers.q33 || pd.workoutDays || '',
        medicalCondition: pd.medicalCondition || '',
      });
      setDirty(false);
    })();
  }, [profile, user?.id]);

  const set = (k: keyof typeof form, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setDirty(true);
  };

  const save = async () => {
    if (!user?.id) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: form.name },
      });
      if (authError) throw authError;

      const profileData = {
        timezone: form.timezone,
        goal: form.goal,
        injuries: form.injuries,
        allergies: form.allergies,
        workoutDays: form.workoutDays,
        medicalCondition: form.medicalCondition,
      };

      const { error: dbError } = await supabase
        .from('users')
        .update({
          full_name: form.name,
          phone_number: form.phone,
          country: form.country,
          profile_data: profileData,
        })
        .eq('id', user.id);
      if (dbError) throw dbError;

      // Sync the four shared answers back into the questionnaire when one exists.
      const { data: existing } = await supabase
        .from('onboarding_questionnaire')
        .select('answers')
        .eq('user_id', user.id)
        .maybeSingle();
      if (existing) {
        let answers: Record<string, string> = {};
        try {
          answers = JSON.parse((existing.answers as string) || '{}');
        } catch {
          answers = {};
        }
        answers.q14 = form.goal;
        answers.q56 = form.injuries;
        answers.q64 = form.allergies;
        answers.q33 = form.workoutDays;
        const { error: qErr } = await supabase
          .from('onboarding_questionnaire')
          .update({ answers: JSON.stringify(answers) })
          .eq('user_id', user.id);
        if (qErr) throw qErr;
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      AccessibilityInfo.announceForAccessibility('Profile saved.');
      void queryClient.invalidateQueries({ queryKey: ['userProfile', user.id] });
      setDirty(false);
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSaveError("Couldn't save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const leave = () => {
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert('Discard changes?', 'Your edits will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  if (isLoading) {
    return (
      <Screen>
        <SkeletonCard lines={4} />
      </Screen>
    );
  }

  const startDate = profile?.package_start_date ? parseLocalDate(profile.package_start_date) : null;
  const endDate =
    startDate && profile?.package_duration ? addMonths(startDate, profile.package_duration) : null;

  const headerBar = (
    <View style={{ gap: spacing.base }}>
      <PageHeader title="Profile" onBack={leave} />

      <SegmentedControl
        label="Profile section"
        value={tab}
        onChange={setTab}
        segments={[
          { value: 'basic', label: 'Basic details' },
          { value: 'assessment', label: 'Assessment' },
        ]}
      />
    </View>
  );

  // The wizard owns its own Screen/ScrollView, so it must not be nested inside one.
  if (tab === 'assessment') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ paddingTop: insets.top + spacing.base, paddingHorizontal: spacing.base }}>
          {headerBar}
        </View>
        <View style={{ flex: 1 }}>
          <QuestionnaireWizard />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={{ gap: spacing.lg }}>
          {headerBar}
          <>
              <Card style={{ gap: spacing.base }}>
                <Input label="Full name" value={form.name} onChangeText={(t) => set('name', t)} autoCapitalize="words" />
                <Input
                  label="Email"
                  value={profile?.email ?? user?.email ?? ''}
                  editable={false}
                  hint="Email can't be changed here."
                />
                <Input
                  label="Phone"
                  value={form.phone}
                  onChangeText={(t) => set('phone', t)}
                  keyboardType="phone-pad"
                />

                <View style={{ gap: spacing.xs }}>
                  <Text variant="label" tone="muted">
                    Country
                  </Text>
                  <Pressable
                    onPress={() => setCountryOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Select country"
                    accessibilityValue={{ text: form.country || 'None selected' }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      minHeight: HIT_SLOP_MIN + 4,
                      paddingHorizontal: spacing.md,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: colors.borderStrong,
                      backgroundColor: colors.elevated,
                    }}
                  >
                    <Text style={{ flex: 1 }} tone={form.country ? 'default' : 'muted'}>
                      {form.country || 'Select your country…'}
                    </Text>
                    <ChevronDown size={iconSize.md} color={colors.mutedForeground} strokeWidth={2} accessible={false} />
                  </Pressable>
                </View>

                <View style={{ gap: spacing.xs }}>
                  <Text variant="label" tone="muted">
                    Timezone
                  </Text>
                  <Pressable
                    onPress={() => setTzOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Select timezone"
                    accessibilityValue={{ text: form.timezone }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                      minHeight: HIT_SLOP_MIN + 4,
                      paddingHorizontal: spacing.md,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: colors.borderStrong,
                      backgroundColor: colors.elevated,
                    }}
                  >
                    <Clock size={iconSize.md} color={colors.mutedForeground} strokeWidth={2} accessible={false} />
                    <Text style={{ flex: 1 }}>{form.timezone.replace(/_/g, ' ')}</Text>
                    <ChevronDown size={iconSize.md} color={colors.mutedForeground} strokeWidth={2} accessible={false} />
                  </Pressable>
                </View>
              </Card>

              <CoachBadge variant="card" />

              <Card style={{ gap: spacing.base }}>
                <Text variant="h2">About you</Text>
                <Input label="Goal" value={form.goal} onChangeText={(t) => set('goal', t)} multiline numberOfLines={3} inputStyle={{ minHeight: 72, textAlignVertical: 'top' }} />
                <Input label="Injuries" value={form.injuries} onChangeText={(t) => set('injuries', t)} multiline numberOfLines={3} inputStyle={{ minHeight: 72, textAlignVertical: 'top' }} />
                <Input label="Food allergies" value={form.allergies} onChangeText={(t) => set('allergies', t)} />
                <Input label="Workout days per week" value={form.workoutDays} onChangeText={(t) => set('workoutDays', t)} hint="e.g. 3-4 days" />
                <Input label="Medical conditions" value={form.medicalCondition} onChangeText={(t) => set('medicalCondition', t)} />
              </Card>

              {startDate ? (
                <Card style={{ gap: spacing.sm }}>
                  <Text variant="h2">Program</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="bodySm" tone="muted">
                      Start
                    </Text>
                    <Text variant="bodySm" numeric>
                      {format(startDate, 'dd-MM-yyyy')}
                    </Text>
                  </View>
                  {endDate ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text variant="bodySm" tone="muted">
                        End
                      </Text>
                      <Text variant="bodySm" numeric>
                        {format(endDate, 'dd-MM-yyyy')}
                      </Text>
                    </View>
                  ) : null}
                </Card>
              ) : null}

              {saveError ? (
                <Text variant="bodySm" tone="primary" accessibilityLiveRegion="polite">
                  {saveError}
                </Text>
              ) : null}

              <Button label="Save changes" onPress={save} loading={saving} disabled={!dirty} />

              <Button
                label="Sign out"
                variant="secondary"
                onPress={() =>
                  Alert.alert('Sign out?', "You'll need to sign in again.", [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
                  ])
                }
              />
          </>
        </View>
      </Screen>

      <CountryPicker
        visible={countryOpen}
        onClose={() => setCountryOpen(false)}
        selected={null}
        onSelect={(c: Country) => set('country', c.country)}
      />
      <TimezonePicker
        visible={tzOpen}
        onClose={() => setTzOpen(false)}
        selected={form.timezone}
        onSelect={(z) => set('timezone', z)}
      />
    </KeyboardAvoidingView>
  );
}
