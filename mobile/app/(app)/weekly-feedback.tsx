import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { Camera, CheckCircle2, Ruler } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import {
  Button,
  Card,
  Input,
  OptionRow,
  PageHeader,
  ProgressBar,
  RatingRow,
  Screen,
  SkeletonCard,
  Text,
} from '@/components/ui';
import { WEEKLY_SECTIONS, WEEKLY_STEPS, emptyWeekly } from '@/components/weekly/steps';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { supabase } from '@/lib/supabase';
import { num } from '@/types/db';
import { iconSize, spacing, useTheme } from '@/theme';

const draftKey = (userId: string) => `weekly-feedback-draft:${userId}`;

export default function WeeklyFeedbackScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { checkIns } = useDashboardData();
  const scrollRef = useRef<ScrollView>(null);

  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Record<string, string>>(emptyWeekly);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  const { data: history, isLoading } = useQuery({
    queryKey: ['weeklyCheckIns', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error: e } = await supabase
        .from('weekly_check_ins')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (e) throw e;
      return (data ?? []) as Record<string, string | null>[];
    },
    enabled: !!user?.id,
  });

  const weekNumber = (history?.length ?? 0) + 1;
  const firstName = (user?.user_metadata?.full_name ?? '').split(' ')[0] || 'there';

  // Averages from this week's dailies — prefilled, editable, same stored shape.
  const prefill = useMemo<Record<string, string>>(() => {
    const last7 = (checkIns ?? []).slice(-7);
    if (!last7.length) return {} as Record<string, string>;
    const avg = (pick: (c: (typeof last7)[number]) => number) =>
      last7.reduce((s, c) => s + pick(c), 0) / last7.length;
    return {
      step_count: String(Math.round(avg((c) => c.daily_steps ?? 0)) || ''),
      water_intake: (Math.round(avg((c) => num(c.water_liters)) * 10) / 10 || '').toString(),
      stress_level: String(Math.round(avg((c) => c.stress_level ?? 0)) || ''),
    };
  }, [checkIns]);

  // Insert-only table + long free text = a local draft is the ONLY protection.
  useEffect(() => {
    if (!user?.id || restored) return;
    void AsyncStorage.getItem(draftKey(user.id)).then((raw) => {
      setRestored(true);
      if (!raw) {
        setForm((f) => ({ ...f, ...prefill }));
        return;
      }
      try {
        const saved = JSON.parse(raw) as { form: Record<string, string>; step: number };
        setForm({ ...emptyWeekly(), ...prefill, ...saved.form });
        setStep(saved.step ?? 0);
        setStarted(true);
      } catch {
        setForm((f) => ({ ...f, ...prefill }));
      }
    });
  }, [user?.id, prefill, restored]);

  useEffect(() => {
    if (!user?.id || !started || submitted) return;
    void AsyncStorage.setItem(draftKey(user.id), JSON.stringify({ form, step })).catch(() => {});
  }, [form, step, user?.id, started, submitted]);

  const submit = async () => {
    if (!user?.id) return;
    setSubmitting(true);
    setError(null);
    try {
      // All values are strings; week_start_date is never set (web parity).
      const { error: e } = await supabase
        .from('weekly_check_ins')
        .insert({ user_id: user.id, ...form });
      if (e) throw e;
      await AsyncStorage.removeItem(draftKey(user.id)).catch(() => {});
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      AccessibilityInfo.announceForAccessibility('Weekly check-in submitted.');
      void queryClient.invalidateQueries({ queryKey: ['weeklyCheckIns', user.id] });
      setSubmitted(true);
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError("Couldn't submit. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Screen>
        <View style={{ gap: spacing.lg, paddingTop: spacing.xl, alignItems: 'center' }}>
          <CheckCircle2 size={iconSize.xl} color={colors.success} strokeWidth={2} accessible={false} />
          <Text variant="h1">Thanks, {firstName}!</Text>
          <Card style={{ gap: spacing.md }}>
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

  if (isLoading) {
    return (
      <Screen>
        <SkeletonCard lines={3} />
      </Screen>
    );
  }

  if (!started) {
    return (
      <Screen>
        <View style={{ gap: spacing.lg }}>
          <PageHeader title="Weekly check-in" onBack={() => router.back()} />

          <Card style={{ gap: spacing.md }}>
            <Text variant="h2">Hi {firstName}! 👋</Text>
            <Text variant="bodySm" tone="muted">
              Ready for your Week {weekNumber} check-in? It takes a few minutes, and your coach
              reads every word.
            </Text>
            <Button label="Start" onPress={() => setStarted(true)} />
          </Card>

          {history?.length ? (
            <View style={{ gap: spacing.md }}>
              <Text variant="h2">Past check-ins</Text>
              {history.map((h, i) => (
                <Card key={String(h.id)} style={{ gap: spacing.sm }}>
                  <Text variant="h2">Week {history.length - i}</Text>
                  <Text variant="bodySm" tone="muted">
                    {h.created_at ? format(new Date(h.created_at), 'd MMM yyyy') : ''}
                  </Text>
                  {WEEKLY_SECTIONS.map((section) => {
                    const answered = section.keys.filter((k) => h[k]);
                    if (!answered.length) return null;
                    return (
                      <View key={section.title} style={{ gap: spacing.xs, marginTop: spacing.sm }}>
                        <Text variant="label" tone="muted">
                          {section.title}
                        </Text>
                        {answered.map((k) => (
                          <Text key={k} variant="bodySm">
                            {h[k]}
                          </Text>
                        ))}
                      </View>
                    );
                  })}
                </Card>
              ))}
            </View>
          ) : null}
        </View>
      </Screen>
    );
  }

  const current = WEEKLY_STEPS[step];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen ref={scrollRef}>
        <View style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.sm }}>
            <Text variant="label" tone="muted">
              Step {step + 1} of {WEEKLY_STEPS.length}
            </Text>
            <ProgressBar
              value={(step + 1) / WEEKLY_STEPS.length}
              accessibilityLabel={`Step ${step + 1} of ${WEEKLY_STEPS.length}`}
            />
          </View>

          <View style={{ gap: spacing.xs }}>
            <Text variant="h1">{current.title}</Text>
            <Text variant="bodySm" tone="muted">
              {current.description}
            </Text>
          </View>

          <Card style={{ gap: spacing.lg }}>
            {current.fields.map((f) => {
              const value = form[f.key] ?? '';
              const set = (v: string) => setForm((p) => ({ ...p, [f.key]: v }));

              if (f.type === 'radio') {
                return (
                  <View key={f.key} style={{ gap: spacing.sm }}>
                    <Text variant="label" tone="muted">
                      {f.label}
                    </Text>
                    {(f.options ?? []).map((o) => (
                      <OptionRow key={o} label={o} selected={value === o} onPress={() => set(o)} />
                    ))}
                  </View>
                );
              }

              if (f.type === 'scale') {
                return (
                  <View key={f.key} style={{ gap: spacing.sm }}>
                    <Text variant="label" tone="muted">
                      {f.label}
                    </Text>
                    <RatingRow
                      label={f.label}
                      min={1}
                      max={10}
                      value={value ? Number(value) : null}
                      onChange={(n) => set(String(n))}
                    />
                  </View>
                );
              }

              const multiline = f.type === 'textarea';
              return (
                <Input
                  key={f.key}
                  label={f.label}
                  value={value}
                  onChangeText={set}
                  multiline={multiline}
                  numberOfLines={multiline ? 4 : 1}
                  inputStyle={multiline ? { minHeight: 96, textAlignVertical: 'top' } : undefined}
                  keyboardType={f.type === 'number' ? 'decimal-pad' : 'default'}
                  hint={f.prefill ? 'Prefilled from your daily check-ins — edit if needed' : undefined}
                />
              );
            })}
          </Card>

          {error ? (
            <Text variant="bodySm" tone="primary" accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {step > 0 ? (
              <Button
                label="Back"
                variant="secondary"
                onPress={() => {
                  setStep((s) => s - 1);
                  scrollRef.current?.scrollTo({ y: 0, animated: true });
                }}
                style={{ width: 110 }}
              />
            ) : null}
            <Button
              label={step === WEEKLY_STEPS.length - 1 ? 'Submit' : 'Next'}
              loading={submitting}
              onPress={() => {
                if (step === WEEKLY_STEPS.length - 1) void submit();
                else {
                  setStep((s) => s + 1);
                  scrollRef.current?.scrollTo({ y: 0, animated: true });
                }
              }}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
