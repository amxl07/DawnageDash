import { useQueryClient } from '@tanstack/react-query';
import { useNavigation, usePreventRemove } from 'expo-router/react-navigation';
import * as Haptics from 'expo-haptics';
import { addMonths, format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown, Clock } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { CountryPicker, type Country } from '@/components/auth/CountryPicker';
import { TimezonePicker } from '@/components/onboarding/TimezonePicker';
import { CoachBadge } from '@/components/coach/CoachBadge';
import { QuestionnaireWizard } from '@/components/questionnaire';
import type { AssessmentExitGuard } from '@/components/questionnaire/QuestionnaireWizard';
import {
  Button,
  Card,
  ErrorState,
  Input,
  PageHeader,
  Screen,
  SegmentedControl,
  SkeletonCard,
  Text,
} from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import {
  clearProfileSaveRecovery, markProfileRowSaved, prepareProfileSave, profileMatchesRecovery, restoreProfileForm,
  readProfileSaveRecovery, runProfileSaveOperation, waitForProfileSaveOperation,
  type ProfileForm, type ProfileSaveRecovery,
} from '@/features/profile/profileSaveRecovery';
import { useUserProfile } from '@/hooks/usePlans';
import type { UserProfile } from '@/hooks/usePlans';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { parseLocalDate } from '@/lib/dates';
import { saveAssessment } from '../../../shared/assessment-save';
import { changedAnswers, answerText } from '@/lib/questionnaire-data';
import { saveProfilePatch } from '../../../shared/profile-save';
import { supabase } from '@/lib/supabase';
import { detectTimezone } from '@/lib/timezones';
import { HIT_SLOP_MIN, iconSize, radius, spacing, useTheme } from '@/theme';

type Tab = 'basic' | 'assessment';
type AssessmentOverlap = { q14: string; q56: string; q64: string; q33: string };
type AccountEpoch = { userId: string | undefined };
type ProfileRow = Pick<UserProfile, 'full_name' | 'phone_number' | 'country' | 'profile_data'>;

const emptyForm = (): ProfileForm => ({ name: '', phone: '', country: '', timezone: detectTimezone(), goal: '', injuries: '', allergies: '', workoutDays: '', medicalCondition: '' });
const sameForm = (a: ProfileForm, b: ProfileForm) => (Object.keys(a) as (keyof ProfileForm)[]).every((field) => a[field] === b[field]);
const overlap = (form: ProfileForm): AssessmentOverlap => ({ q14: form.goal, q56: form.injuries, q64: form.allergies, q33: form.workoutDays });
const profileFields = (form: ProfileForm) => ({ full_name: form.name, phone_number: form.phone, country: form.country });
const profilePatch = (form: ProfileForm) => ({ timezone: form.timezone, goal: form.goal, injuries: form.injuries, allergies: form.allergies, workoutDays: form.workoutDays, medicalCondition: form.medicalCondition });
const syncFailure = 'Profile details were saved, but assessment sync failed. Retry when connected.';

function parseAnswerRecord(value: unknown): Record<string, unknown> {
  if (value != null && typeof value !== 'string') throw new Error('Assessment answers are not JSON text.');
  const parsed = JSON.parse(value == null ? '{}' : value as string) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Assessment answers are not a JSON object.');
  }
  return parsed as Record<string, unknown>;
}

function hydrateForm(profile: ProfileRow, answers: Record<string, unknown>): ProfileForm {
  const pd = profile.profile_data ?? {};
  const text = (value: unknown) => value == null ? '' : String(value);
  const answer = (id: string, fallback: unknown) => {
    const value = answers[id];
    if (value != null && typeof value !== 'string' && typeof value !== 'number') throw new Error('Assessment answer is invalid.');
    return answerText(answers, id, fallback);
  };
  return {
    name: profile.full_name ?? '', phone: profile.phone_number ?? '', country: profile.country ?? '',
    timezone: text(pd.timezone) || detectTimezone(), goal: answer('q14', pd.goal),
    injuries: answer('q56', pd.injuries), allergies: answer('q64', pd.allergies),
    workoutDays: answer('q33', pd.workoutDays), medicalCondition: text(pd.medicalCondition),
  };
}

async function readCurrentProfile(userId: string): Promise<ProfileRow> {
  const { data, error } = await supabase.from('users').select('full_name, phone_number, country, profile_data').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Profile row was not found.');
  return data as ProfileRow;
}

export default function ProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ assessment?: string }>();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { data: profile, isLoading, isError: profileLoadError, refetch } = useUserProfile();
  const { isCompact } = useResponsiveLayout();

  const [tab, setTab] = useState<Tab>(params.assessment === '1' ? 'assessment' : 'basic');
  const assessmentGuard = useRef<AssessmentExitGuard | null>(null);
  const registerAssessmentGuard = useCallback((guard: AssessmentExitGuard | null) => { assessmentGuard.current = guard; }, []);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<ProfileSaveRecovery | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [readyAccount, setReadyAccount] = useState<AccountEpoch | null>(null);
  const [exitAction, setExitAction] = useState<(() => void) | null>(null);
  const [countryOpen, setCountryOpen] = useState(false);
  const [tzOpen, setTzOpen] = useState(false);

  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const identity = useRef<AccountEpoch>({ userId: user?.id });
  if (identity.current.userId !== user?.id) identity.current = { userId: user?.id };
  const account = identity.current;
  const mounted = useRef(true);
  const generation = useRef(0);
  const initialized = useRef<AccountEpoch | null>(null);
  const operation = useRef<object | null>(null);
  const formRef = useRef(form);
  const baseline = useRef(form);
  const recoveryRef = useRef(recovery);
  const syncAcknowledged = useRef<string | null>(null);
  const current = useCallback((origin: AccountEpoch) => mounted.current && identity.current === origin, []);
  const pendingAssessmentSync = recovery?.phase === 'profile-saved';
  const editable = !saving && !pendingAssessmentSync;

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current += 1; }; }, []);

  useEffect(() => {
    operation.current = null;
    initialized.current = null;
    recoveryRef.current = null;
    syncAcknowledged.current = null;
    setRecovery(null); setSaving(false); setDirty(false); setSaveError(null); setLoadError(false);
    setExitAction(null); setReadyAccount(null); setCountryOpen(false); setTzOpen(false);
  }, [account]);

  useEffect(() => {
    if (profileLoadError || !profile || !account.userId || profile.id !== account.userId || initialized.current === account) return;
    const source = profile;
    const userId = account.userId;
    const loadGeneration = ++generation.current;
    const active = () => current(account) && generation.current === loadGeneration;
    setLoadError(false);
    void (async () => {
      try {
        await waitForProfileSaveOperation(userId);
        if (!active()) return;
        const entry = await readProfileSaveRecovery(userId);
        if (!active()) return;
        const { data: q, error } = await supabase.from('onboarding_questionnaire').select('answers').eq('user_id', userId).maybeSingle();
        if (error) throw error;
        const answers = q ? parseAnswerRecord(q.answers) : {};
        const canonical = entry ? await readCurrentProfile(userId) : source;
        if (!active()) return;
        let restored = entry;
        if (entry?.phase === 'prepared' && profileMatchesRecovery(canonical, entry.form, entry.profileDataPatch, entry.profileFieldsPatch)) {
          if (!await markProfileRowSaved(userId, entry.id)) throw new Error('Recovery changed. Reload your profile.');
          restored = { ...entry, phase: 'profile-saved' };
        }
        if (!active()) return;
        const saved = hydrateForm(canonical, answers);
        const next = restored ? restoreProfileForm(saved, restored) : saved;
        baseline.current = restored?.phase === 'prepared' ? saved : next;
        formRef.current = next; recoveryRef.current = restored;
        setForm(next); setRecovery(restored); setDirty(restored?.phase === 'prepared');
        setSaveError(restored?.phase === 'prepared'
          ? 'Your recovered edits are not confirmed saved. Review them and save when ready.'
          : restored ? 'Profile details are saved. Retry the pending assessment update.' : null);
        initialized.current = account;
        setReadyAccount(account);
      } catch {
        if (active()) setLoadError(true);
      }
    })();
    return () => { generation.current += 1; };
  }, [profile, profileLoadError, account, loadAttempt, current]);

  const set = (k: keyof ProfileForm, v: string) => {
    if (!current(account) || operation.current || recoveryRef.current?.phase === 'profile-saved' || readyAccount !== account) return;
    const next = { ...formRef.current, [k]: v };
    formRef.current = next; setForm(next); setDirty(!sameForm(next, baseline.current));
  };

  const syncAssessment = async (entry: ProfileSaveRecovery, active: () => boolean) => {
    // Older recovery journals predate narrow patches; preserve their explicit pending intent.
    await saveAssessment(supabase, entry.userId, entry.assessmentPatch ?? overlap(entry.form), [], active, { create: false });
    return active();
  };

  const save = async () => {
    if (!current(account) || !account.userId || readyAccount !== account || operation.current) return;
    if (!recoveryRef.current && sameForm(formRef.current, baseline.current)) return;
    const userId = account.userId;
    const token = {};
    operation.current = token;
    const active = () => current(account) && operation.current === token;
    const snapshot = { ...formRef.current };
    let entry = recoveryRef.current;
    const alreadyAcknowledged = entry?.phase === 'profile-saved';
    const progress: { stage: 'prepare' | 'profile' | 'mark' | 'assessment' | 'clear' } = {
      stage: entry?.phase === 'profile-saved' ? 'mark' : 'prepare',
    };
    setSaving(true); setSaveError(null);
    try {
      await runProfileSaveOperation(userId, async () => {
        if (!active()) return;
        if (entry?.phase === 'prepared') {
          progress.stage = 'profile';
          const canonical = await readCurrentProfile(userId);
          if (!active()) return;
          if (profileMatchesRecovery(canonical, entry.form, entry.profileDataPatch, entry.profileFieldsPatch)) entry = { ...entry, phase: 'profile-saved' };
        }
        if (entry?.phase !== 'profile-saved') {
          progress.stage = 'prepare';
          // Keep the recorded intent; diff later explicit edits against the restored
          // editor, not against unrelated server facts that changed while away.
          const intentBaseline = entry ? restoreProfileForm(baseline.current, { ...entry, phase: 'prepared' }) : baseline.current;
          const pending = entry;
          entry = await prepareProfileSave(userId, snapshot, {
            assessmentPatch: { ...(pending ? pending.assessmentPatch ?? overlap(pending.form) : {}), ...changedAnswers(overlap(intentBaseline), overlap(snapshot)) },
            profileDataPatch: { ...(pending ? pending.profileDataPatch ?? profilePatch(pending.form) : {}), ...changedAnswers(profilePatch(intentBaseline), profilePatch(snapshot)) },
            profileFieldsPatch: { ...(pending ? pending.profileFieldsPatch ?? profileFields(pending.form) : {}), ...changedAnswers(profileFields(intentBaseline), profileFields(snapshot)) },
          });
          if (!active()) return;
          recoveryRef.current = entry; setRecovery(entry);
          progress.stage = 'profile';
          if (!entry.profileFieldsPatch || Object.prototype.hasOwnProperty.call(entry.profileFieldsPatch,'full_name')) {
            const { error: authError } = await supabase.auth.updateUser({ data: { full_name: snapshot.name } });
            if (authError) throw authError;
            if (!active()) return;
          }
          const intent = entry;
          await saveProfilePatch(supabase, userId, intent.profileFieldsPatch ?? profileFields(snapshot), intent.profileDataPatch ?? profilePatch(snapshot), active, async () => {
            if (!active()) {
              // Preserve an actual receipt for the old account without touching current UI.
              entry = { ...intent, phase: 'profile-saved' };
              if (!await markProfileRowSaved(userId, intent.id)) throw new Error('Recovery was superseded.');
            }
          });
          entry = { ...entry, phase: 'profile-saved' };
        }
        // Record acknowledgment for the originating account even after navigation/account change.
        progress.stage = 'mark';
        if (active()) {
          recoveryRef.current = entry; setRecovery(entry);
          if (!alreadyAcknowledged) baseline.current = restoreProfileForm(baseline.current, { ...entry, phase: 'prepared' });
          setDirty(!sameForm(formRef.current, baseline.current));
        }
        if (!await markProfileRowSaved(userId, entry.id)) throw new Error('Recovery was superseded.');
        if (!active()) return;
        progress.stage = 'assessment';
        if (syncAcknowledged.current !== entry.id) {
          if (!await syncAssessment(entry, active)) return;
          if (active()) syncAcknowledged.current = entry.id;
        }
        progress.stage = 'clear';
        if (!await clearProfileSaveRecovery(userId, entry.id)) throw new Error('Recovery was superseded.');
        if (!active()) return;
        recoveryRef.current = null; syncAcknowledged.current = null; setRecovery(null);
        const newerEdits = !sameForm(formRef.current, baseline.current);
        setDirty(newerEdits);
        if (newerEdits) setSaveError('The previous save finished. Your newer edits still need saving.');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        AccessibilityInfo.announceForAccessibility(newerEdits ? 'The previous save finished. Your newer edits still need saving.' : 'Profile saved.');
        void queryClient.invalidateQueries({ queryKey: ['userProfile', userId] });
        void queryClient.invalidateQueries({ queryKey: ['homeAssessment', userId] });
      });
    } catch {
      if (active()) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setSaveError(progress.stage === 'prepare'
          ? "Couldn't save recovery on this device. Your edits are still here. Retry before leaving."
          : progress.stage === 'mark' ? 'Profile details are saved. Recovery could not be updated on this device. Keep this screen open and retry.'
          : progress.stage === 'clear' ? 'Profile is saved. This device couldn’t finish recording the save. Retry to finish.'
          : entry?.phase === 'profile-saved' ? syncFailure
          : "Couldn't save. Your edits are not confirmed saved. Check your connection and try again.");
      }
    } finally {
      if (active()) { operation.current = null; setSaving(false); }
    }
  };

  const requestExit = (proceed: () => void) => {
    if (!current(account)) return;
    const finish = () => { if (current(account)) proceed(); };
    if (operation.current) {
      Alert.alert('Saving profile', 'Please wait for this save to finish. Your edits are still here.');
      return;
    }
    const durableExit = () => {
      if (!recoveryRef.current) { finish(); return; }
      const saved = recoveryRef.current.phase === 'profile-saved';
      Alert.alert(saved ? 'Assessment sync pending' : 'Profile save pending',
        saved ? 'Your profile details are saved. The assessment update is saved on this device for retry when you return.'
          : 'Your edits are saved on this device, but the profile save is not confirmed. Return here to retry.', [
          { text: 'Stay here', style: 'cancel' },
          { text: saved ? 'Retry sync' : 'Retry save', onPress: () => void save() },
          { text: 'Leave anyway', onPress: finish },
        ]);
    };
    const recoverableForm = recoveryRef.current ? restoreProfileForm(baseline.current, recoveryRef.current) : baseline.current;
    if (dirty && (!recoveryRef.current || !sameForm(formRef.current, recoverableForm))) {
      Alert.alert('Discard changes?', 'Only your unsaved edits will be discarded. Any pending saved update stays on this device.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => {
          if (!current(account)) return;
          const restored = recoveryRef.current ? restoreProfileForm(baseline.current, recoveryRef.current) : baseline.current;
          formRef.current = restored; setForm(restored); setDirty(!sameForm(restored, baseline.current)); durableExit();
        } },
      ]);
    } else durableExit();
  };
  const authorizeRouteExit = (proceed: () => void) => setExitAction(() => proceed);
  const leave = () => requestExit(() => authorizeRouteExit(() => router.back()));
  // The assessment child owns its native dirty guard; all Profile edits were resolved before entering it.
  usePreventRemove(tab === 'basic' && !exitAction && (dirty || saving || !!recovery), ({ data }) => {
    requestExit(() => authorizeRouteExit(() => navigation.dispatch(data.action)));
  });
  useEffect(() => { exitAction?.(); }, [exitAction]);

  const changeTab = (next: Tab) => {
    const proceed = () => requestExit(() => {
      if (next === 'basic' && !recoveryRef.current && !dirty) {
        initialized.current = null; setReadyAccount(null); setLoadAttempt((value) => value + 1);
      }
      setTab(next);
    });
    if (assessmentGuard.current) assessmentGuard.current(proceed);
    else proceed();
  };

  if (readyAccount !== account && (loadError || profileLoadError || (!isLoading && (!profile || profile.id !== account.userId)))) {
    return <Screen><PageHeader title="Profile" onBack={() => router.back()} />
      <ErrorState title="Couldn't load your profile" message="Your saved details have not been changed. Check your connection and retry."
        onRetry={() => { setLoadError(false); if (profileLoadError || !profile) void refetch(); setLoadAttempt((value) => value + 1); }} />
    </Screen>;
  }
  if (readyAccount !== account) return <Screen><PageHeader title="Profile" onBack={() => router.back()} /><SkeletonCard lines={4} /></Screen>;

  const startDate = profile?.package_start_date ? parseLocalDate(profile.package_start_date) : null;
  const endDate =
    startDate && profile?.package_duration ? addMonths(startDate, profile.package_duration) : null;

  const headerBar = (
    <View style={{ gap: spacing.base }}>
      <PageHeader
        title="Profile"
        onBack={() => assessmentGuard.current ? assessmentGuard.current(leave) : leave()}
      />

      <SegmentedControl
        label="Profile section"
        showLabel={false}
        value={tab}
        onChange={changeTab}
        segments={[
          { value: 'basic', label: 'Basic details' },
          { value: 'assessment', label: 'Assessment' },
        ]}
      />
    </View>
  );

  if (tab === 'assessment') {
    return <QuestionnaireWizard screenHeader={headerBar} onGuardChange={registerAssessmentGuard} />;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={{ gap: spacing.lg }}>
          {headerBar}
          <>
              <Card style={{ gap: spacing.base }}>
                <Input label="Full name" value={form.name} editable={editable} onChangeText={(t) => set('name', t)} autoCapitalize="words" />
                <Input
                  label="Email"
                  value={profile?.email ?? user?.email ?? ''}
                  editable={false}
                  hint="Email can't be changed here."
                />
                <Input
                  label="Phone"
                  value={form.phone}
                  editable={editable}
                  onChangeText={(t) => set('phone', t)}
                  keyboardType="phone-pad"
                />

                <View style={{ gap: spacing.xs }}>
                  <Text variant="label" tone="muted">
                    Country
                  </Text>
                  <Pressable
                    disabled={!editable}
                    onPress={() => setCountryOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Select country"
                    accessibilityValue={{ text: form.country || 'None selected' }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      minHeight: HIT_SLOP_MIN + 4,
                      paddingHorizontal: spacing.md,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: colors.borderStrong,
                      backgroundColor: pressed ? colors.pressed : colors.elevated,
                    })}
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
                    disabled={!editable}
                    onPress={() => setTzOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Select timezone"
                    accessibilityValue={{ text: form.timezone }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                      minHeight: HIT_SLOP_MIN + 4,
                      paddingHorizontal: spacing.md,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: colors.borderStrong,
                      backgroundColor: pressed ? colors.pressed : colors.elevated,
                    })}
                  >
                    <Clock size={iconSize.md} color={colors.mutedForeground} strokeWidth={2} accessible={false} />
                    <Text style={{ flex: 1 }}>{form.timezone.replace(/_/g, ' ')}</Text>
                    <ChevronDown size={iconSize.md} color={colors.mutedForeground} strokeWidth={2} accessible={false} />
                  </Pressable>
                </View>
              </Card>

              <CoachBadge variant="card" fallback="status" />

              <Card style={{ gap: spacing.base }}>
                <Text variant="h2">About you</Text>
                <Input label="Goal" value={form.goal} editable={editable} onChangeText={(t) => set('goal', t)} multiline numberOfLines={3} inputStyle={{ minHeight: 72, textAlignVertical: 'top' }} />
                <Input label="Injuries" value={form.injuries} editable={editable} onChangeText={(t) => set('injuries', t)} multiline numberOfLines={3} inputStyle={{ minHeight: 72, textAlignVertical: 'top' }} />
                <Input label="Food allergies" value={form.allergies} editable={editable} onChangeText={(t) => set('allergies', t)} />
                <Input label="Workout days per week" value={form.workoutDays} editable={editable} onChangeText={(t) => set('workoutDays', t)} hint="e.g. 3-4 days" />
                <Input label="Medical conditions" value={form.medicalCondition} editable={editable} onChangeText={(t) => set('medicalCondition', t)} />
              </Card>

              {startDate ? (
                <Card style={{ gap: spacing.sm }}>
                  <Text variant="h2">Program</Text>
                  <View
                    testID="program-start-row"
                    style={{
                      flexDirection: isCompact ? 'column' : 'row',
                      alignItems: isCompact ? 'flex-start' : 'center',
                      justifyContent: isCompact ? undefined : 'space-between',
                      gap: isCompact ? spacing.xs : spacing.md,
                    }}
                  >
                    <Text variant="bodySm" tone="muted">
                      Start
                    </Text>
                    <Text variant="bodySm" numeric>
                      {format(startDate, 'dd-MM-yyyy')}
                    </Text>
                  </View>
                  {endDate ? (
                    <View
                      testID="program-end-row"
                      style={{
                        flexDirection: isCompact ? 'column' : 'row',
                        alignItems: isCompact ? 'flex-start' : 'center',
                        justifyContent: isCompact ? undefined : 'space-between',
                        gap: isCompact ? spacing.xs : spacing.md,
                      }}
                    >
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

              <Button
                label={pendingAssessmentSync ? 'Retry assessment sync' : 'Save changes'}
                onPress={save}
                loading={saving}
                disabled={saving || (!dirty && !recovery)}
              />

              <Button
                label="Sign out"
                variant="secondary"
                onPress={() => requestExit(() => {
                  Alert.alert('Sign out?', "You'll need to sign in again.", [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign out', style: 'destructive', onPress: () => {
                      if (current(account)) authorizeRouteExit(() => { void signOut(); });
                    } },
                  ]);
                })}
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
