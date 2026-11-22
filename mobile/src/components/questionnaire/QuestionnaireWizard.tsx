import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, usePreventRemove } from 'expo-router/react-navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';

import { Button, Card, ErrorState, OptionRow, ProgressBar, Screen, Sheet, SheetScrollView, SkeletonCard, Text } from '@/components/ui';
import { MotionReveal } from '@/components/ui/MotionReveal';
import { useAuth } from '@/contexts/AuthContext';
import { mergeProfileData } from '@/lib/profile-data';
import { questionnaireSections } from '@/lib/questionnaire-data';
import { supabase } from '@/lib/supabase';
import { spacing, useMotion } from '@/theme';
import { QuestionField } from './QuestionField';
import { QuestionnaireSummary } from './QuestionnaireSummary';

type Answers = Record<string, string | number>;
export type AssessmentExitGuard = (exit: () => void) => void;
type QuestionnaireWizardProps = { screenHeader?: React.ReactNode; onGuardChange?: (guard: AssessmentExitGuard | null) => void };
type FocusTarget = View & { focus?: () => void };

function focusAssessmentTitle(target: FocusTarget | null) {
  if (!target) return;
  if (Platform.OS === 'web') {
    if (typeof target.focus === 'function') target.focus();
    return;
  }
  try {
    const handle = findNodeHandle(target);
    if (handle !== null) AccessibilityInfo.setAccessibilityFocus(handle);
  } catch {
    // The section may be replaced while a save or exit decision resolves.
  }
}

function parseAnswers(value: unknown): Answers {
  const parsed = JSON.parse(typeof value === 'string' && value ? value : '{}') as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Assessment answers are not a JSON object.');
  }
  return parsed as Answers;
}

function parseCompletedSections(value: unknown): string[] {
  const parsed = JSON.parse(typeof value === 'string' && value ? value : '[]') as unknown;
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
    throw new Error('Assessment progress is not a string array.');
  }
  return parsed;
}

export function QuestionnaireWizard({ screenHeader, onGuardChange }: QuestionnaireWizardProps) {
  const { user } = useAuth();
  const navigation = useNavigation();
  const cache = useQueryClient();
  const motion = useMotion();
  const scrollRef = useRef<ScrollView>(null);
  const sectionTitleRef = useRef<View>(null);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [completed, setCompleted] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [overview, setOverview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pendingExit, setPendingExit] = useState<(() => void) | null>(null);
  const acknowledged = useRef<Answers>({});
  const identity = useRef(user?.id);
  identity.current = user?.id;
  const loadGeneration = useRef(0);
  const saveLock = useRef(false);
  const positionWrites = useRef<Promise<void>>(Promise.resolve());

  const rememberSection = (target: number, userId: string) => {
    const write = positionWrites.current.catch(() => {}).then(() => AsyncStorage.setItem('assessment-section:' + userId, questionnaireSections[target].id));
    positionWrites.current = write;
    return write;
  };
  const showSection = (target: number) => {
    if (!user?.id) return;
    const userId = user.id;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    setIndex(target);
    void rememberSection(target, userId).catch(() => {
      if (identity.current === userId) setSaveError('Your section position couldn’t be saved on this device. Your saved answers are safe.');
    });
  };

  const section = questionnaireSections[index];
  const total = questionnaireSections.length;

  useLayoutEffect(() => {
    if (loading || loadError || showSummary) return;
    focusAssessmentTitle(sectionTitleRef.current as FocusTarget | null);
  }, [index, loadError, loading, showSummary]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const userId = user.id;
    const generation = ++loadGeneration.current;
    setLoading(true);
    setLoadError(false);
    try {
      const { data, error } = await supabase
        .from('onboarding_questionnaire')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      const position = await AsyncStorage.getItem('assessment-section:' + userId).catch(() => null);
      if (identity.current !== userId || generation !== loadGeneration.current) return;
      const remembered = questionnaireSections.findIndex((entry) => entry.id === position);

      if (data) {
        const parsedAnswers = parseAnswers(data.answers);
        const parsedCompleted = parseCompletedSections(data.completed_sections);
        setAnswers(parsedAnswers);
        acknowledged.current = parsedAnswers;
        setDirty(false);
        setCompleted(parsedCompleted);
        if (data.status === 'completed') {
          setShowSummary(true);
        } else {
          // Resume at the first section they haven't finished.
          const firstIncomplete = questionnaireSections.findIndex(
            (s) => !parsedCompleted.includes(s.id),
          );
          setIndex(remembered >= 0 ? remembered : firstIncomplete === -1 ? 0 : firstIncomplete);
        }
      } else {
        setAnswers({}); acknowledged.current = {}; setCompleted([]); setIndex(remembered >= 0 ? remembered : 0); setShowSummary(false); setDirty(false);
      }
    } catch {
      if (identity.current === userId && generation === loadGeneration.current) setLoadError(true);
    } finally {
      if (identity.current === userId && generation === loadGeneration.current) setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
    return () => { loadGeneration.current += 1; };
  }, [load]);

  /** Check-then-update/insert — fail closed because there is no unique user_id constraint. */
  const persist = useCallback(
    async (answerPatch: Answers, nextCompleted: string[]) => {
      if (!user?.id) return;
      const { data: existing, error: readError } = await supabase
        .from('onboarding_questionnaire')
        .select('id, answers, completed_sections')
        .eq('user_id', user.id)
        .maybeSingle();
      if (readError) throw readError;

      const latestAnswers = existing ? parseAnswers(existing.answers) : {};
      const latestCompleted = existing ? parseCompletedSections(existing.completed_sections) : [];
      const mergedAnswers = mergeProfileData(latestAnswers, answerPatch) as Answers;
      const mergedCompleted = Array.from(new Set([...latestCompleted, ...nextCompleted]));
      const payload = {
        user_id: user.id,
        answers: JSON.stringify(mergedAnswers),
        completed_sections: JSON.stringify(mergedCompleted),
        status: questionnaireSections.every((entry) => mergedCompleted.includes(entry.id)) ? 'completed' : 'in_progress',
      };

      if (existing) {
        const { error } = await supabase
          .from('onboarding_questionnaire')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('onboarding_questionnaire').insert(payload);
        if (error) throw error;
      }
      return { answers: mergedAnswers, completed: mergedCompleted };
    },
    [user?.id],
  );

  const save = async (advance: boolean): Promise<boolean> => {
    if (saveLock.current || !user?.id) return false;
    if (advance) {
      const missing = section.questions.filter((q) => q.required && !answers[q.id]);
      if (missing.length) {
        setErrors(Object.fromEntries(missing.map((q) => [q.id, 'This question is required.'])));
        scrollRef.current?.scrollTo({ y: 0, animated: motion.enabled });
        AccessibilityInfo.announceForAccessibility(
          `${missing.length} required question${missing.length > 1 ? 's' : ''} still need an answer.`,
        );
        return false;
      }
    }
    setErrors({});
    saveLock.current = true;
    setSaving(true);
    setSaveError(null);
    const userId = user.id;
    try {
      const nextCompleted = advance
        ? Array.from(new Set([...completed, section.id]))
        : completed;
      const answerPatch = Object.fromEntries(
        section.questions.map((question) => [question.id, answers[question.id]]),
      ) as Answers;
      const persisted = await persist(answerPatch, nextCompleted);
      if (identity.current !== userId) return false;
      if (persisted) {
        setAnswers(persisted.answers);
        setCompleted(persisted.completed);
        acknowledged.current = persisted.answers;
        setDirty(false);
        void cache.invalidateQueries({ queryKey: ['homeAssessment', userId] });
      }
      const nextIndex = advance && index < total - 1 ? index + 1 : index;
      try { await rememberSection(nextIndex, userId); }
      catch { setSaveError('Answers saved. Your section position couldn’t be saved on this device.'); }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (!advance) {
        AccessibilityInfo.announceForAccessibility('Draft saved.');
      } else if (index < total - 1) {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
        setIndex(index + 1);
      } else {
        setShowSummary(true);
      }
      return true;
    } catch {
      if (identity.current === userId) setSaveError("Couldn't save your answers. They are still here. Check your connection and try again.");
      return false;
    } finally {
      saveLock.current = false;
      if (identity.current === userId) setSaving(false);
    }
  };

  const requestExit = useCallback<AssessmentExitGuard>((exit) => {
    if (saveLock.current) return;
    if (!dirty) exit();
    else setPendingExit(() => exit);
  }, [dirty]);
  useEffect(() => { onGuardChange?.(requestExit); return () => onGuardChange?.(null); }, [onGuardChange, requestExit]);
  usePreventRemove(dirty, ({ data }) => requestExit(() => navigation.dispatch(data.action)));
  useEffect(() => {
    if (!dirty && pendingExit) { setPendingExit(null); pendingExit(); }
  }, [dirty, pendingExit]);

  const progress = useMemo(() => (index + 1) / total, [index, total]);

  if (loading) {
    return (
      <Screen>
        {screenHeader}
        <View style={{ gap: spacing.base }}>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={4} />
        </View>
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen>
        {screenHeader}
        <ErrorState
          title="Couldn't load your assessment"
          message="Check your connection and try again."
          onRetry={() => void load()}
        />
      </Screen>
    );
  }

  if (showSummary) {
    return (
      <QuestionnaireSummary
        answers={answers}
        screenHeader={screenHeader}
        onEdit={() => {
          setShowSummary(false);
          showSection(0);
        }}
      />
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Screen ref={scrollRef}>
        {screenHeader}
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" tone="muted">
            Section {index + 1} of {total}
          </Text>
          <ProgressBar
            value={progress}
            accessibilityLabel={`Assessment progress, section ${index + 1} of ${total}`}
          />
          <Button label={completed.filter((id) => questionnaireSections.some((entry) => entry.id === id)).length + ' of ' + total + ' sections complete · View sections'} variant="ghost" onPress={() => setOverview(true)} disabled={saving} />
          <Text variant="bodySm" tone="muted">{dirty ? 'Changes stay here until you save this section.' : 'Save a section or a draft whenever you need a pause.'}</Text>
        </View>

        <MotionReveal revision={index} style={{ gap: spacing.lg }} testID="assessment-section-content">
          <View style={{ gap: spacing.xs, marginTop: spacing.lg }}>
            <View
              ref={sectionTitleRef}
              testID="assessment-section-title"
              accessible
              focusable
              accessibilityRole="header"
            >
              <Text variant="h1" accessibilityElementsHidden>{section.title}</Text>
            </View>
            <Text variant="bodySm" tone="muted">
              {section.description}
            </Text>
          </View>

          <Card style={{ gap: spacing.lg }}>
            {section.questions.map((q) => (
              <QuestionField
                key={q.id}
                question={q}
                value={answers[q.id]}
                error={errors[q.id]}
                onChange={(v) => {
                  if (saveLock.current) return;
                  setAnswers((prev) => ({ ...prev, [q.id]: v }));
                  setDirty(true);
                  setErrors((prev) => ({ ...prev, [q.id]: '' }));
                }}
              />
            ))}
          </Card>
        </MotionReveal>

        {saveError ? (
          <Text
            variant="bodySm"
            tone="primary"
            accessibilityLiveRegion="polite"
            style={{ marginTop: spacing.base }}
          >
            {saveError}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
          {index > 0 ? (
            <Button
              label="Back"
              variant="secondary"
              onPress={() => requestExit(() => showSection(index - 1))}
              disabled={saving}
              style={{ width: 110 }}
            />
          ) : null}
          <Button
            label={index === total - 1 ? 'Finish' : 'Save & continue'}
            onPress={() => void save(true)}
            loading={saving}
            style={{ flex: 1 }}
          />
        </View>

        <Button
          label="Save draft"
          variant="ghost"
          onPress={() => void save(false)}
          disabled={saving}
          style={{ marginTop: spacing.sm }}
        />
      </Screen>
      <Sheet visible={overview} onClose={() => setOverview(false)} title="Your coaching assessment">
        <SheetScrollView contentContainerStyle={{ gap: spacing.sm, padding: spacing.base }}>
          <Text variant="bodySm" tone="muted">Explore each section in your own time. A completed section can still be edited.</Text>
          {questionnaireSections.map((entry, target) => <OptionRow key={entry.id} label={entry.title + ' · ' + (completed.includes(entry.id) ? 'Completed' : 'Not completed')} selected={target === index}
            onPress={() => { setOverview(false); requestExit(() => showSection(target)); }} />)}
        </SheetScrollView>
      </Sheet>
      <Sheet visible={Boolean(pendingExit) && dirty} onClose={() => { if (!saving) setPendingExit(null); }} title="Keep your answers?" dismissible={!saving}>
        <View style={{ gap: spacing.base, padding: spacing.base }}>
          <Text tone="muted">Save this section as a draft to return to it later. If saving fails, your answers will stay here.</Text>
          {saveError ? <Text tone="destructive" accessibilityLiveRegion="polite">{saveError}</Text> : null}
          <Button label="Save draft & leave" loading={saving} onPress={() => { void save(false); }} />
          <Button label="Discard changes" variant="destructive" disabled={saving} onPress={() => { setAnswers(acknowledged.current); setDirty(false); setSaveError(null); }} />
          <Button label="Keep editing" variant="ghost" disabled={saving} onPress={() => setPendingExit(null)} />
        </View>
      </Sheet>
    </KeyboardAvoidingView>
  );
}
