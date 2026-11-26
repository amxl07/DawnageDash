import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, usePreventRemove } from 'expo-router/react-navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';

import { Button, Card, ErrorState, OptionRow, Screen, Sheet, SheetScrollView, SkeletonCard, Text } from '@/components/ui';
import { MotionReveal } from '@/components/ui/MotionReveal';
import { useAuth } from '@/contexts/AuthContext';
import { saveAssessment } from '../../../../shared/assessment-save';
import { questionnaireSections, parseAnswers, parseCompletedSections, changedAnswers, missingRequired, visibleQuestions, validCompletedSections, suggestProfileAnswers, type Answers } from '@/lib/questionnaire-data';
import { supabase } from '@/lib/supabase';
import { spacing, useMotion } from '@/theme';
import { QuestionField } from './QuestionField';
import { QuestionnaireSummary } from './QuestionnaireSummary';

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
    setShowSummary(false); setSaving(false); saveLock.current = false; setPendingExit(null); setOverview(false); setErrors({}); setSaveError(null); setDirty(false);
    setLoadError(false);
    try {
      const { data, error } = await supabase
        .from('onboarding_questionnaire')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (identity.current !== userId || generation !== loadGeneration.current) return;
      const { data: profile, error: profileError } = await supabase.from('users').select('full_name, phone_number, profile_data').eq('id', userId).maybeSingle();
      if (identity.current !== userId || generation !== loadGeneration.current) return;
      if (profileError) throw profileError;
      const position = await AsyncStorage.getItem('assessment-section:' + userId).catch(() => null);
      if (identity.current !== userId || generation !== loadGeneration.current) return;
      const remembered = questionnaireSections.findIndex((entry) => entry.id === position);

      if (data) {
        const parsedAnswers = parseAnswers(data.answers);
        const parsedCompleted = parseCompletedSections(data.completed_sections);
        setAnswers(suggestProfileAnswers(parsedAnswers, profile));
        acknowledged.current = parsedAnswers;
        setDirty(false);
        setCompleted(parsedCompleted);
        if (validCompletedSections(parsedAnswers, parsedCompleted, questionnaireSections).length === total) {
          setShowSummary(true);
        } else {
          // Resume at the first section they haven't finished.
          const firstIncomplete = questionnaireSections.findIndex(
            (s) => !parsedCompleted.includes(s.id),
          );
          setIndex(remembered >= 0 ? remembered : firstIncomplete === -1 ? 0 : firstIncomplete);
        }
      } else {
        setAnswers(suggestProfileAnswers({}, profile)); acknowledged.current = {}; setCompleted([]); setIndex(remembered >= 0 ? remembered : 0); setShowSummary(false); setDirty(false);
      }
    } catch {
      if (identity.current === userId && generation === loadGeneration.current) setLoadError(true);
    } finally {
      if (identity.current === userId && generation === loadGeneration.current) setLoading(false);
    }
  }, [user?.id, total]);

  useEffect(() => {
    void load();
    return () => { loadGeneration.current += 1; };
  }, [load]);

  const persist = useCallback(async (patch: Answers, history: string[], active: () => boolean) => {
    if (!user?.id) throw new Error('Sign in to save.');
    return saveAssessment(supabase, user.id, patch, history, active, { sections: questionnaireSections });
  }, [user?.id]);

  const save = async (advance: boolean): Promise<boolean> => {
    if (saveLock.current || !user?.id) return false;
    if (advance) {
      const missing = missingRequired(section, answers);
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
    const generation = loadGeneration.current;
    try {
      const nextCompleted = advance
        ? Array.from(new Set([...completed, section.id]))
        : completed;
      const answerPatch = changedAnswers(acknowledged.current, answers);
      const active = () => identity.current === userId && generation === loadGeneration.current;
      const persisted = await persist(answerPatch, nextCompleted, active);
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
      catch { if (identity.current === userId && generation === loadGeneration.current) setSaveError('Answers saved. Your section position couldn’t be saved on this device.'); }
      if (identity.current !== userId || generation !== loadGeneration.current) return false;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (!advance) {
        AccessibilityInfo.announceForAccessibility('Draft saved.');
      } else if (index < total - 1) {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
        setIndex(index + 1);
      } else {
        setShowSummary(persisted?.status === 'completed');
        if (persisted?.status !== 'completed') setSaveError('Draft saved. Complete the remaining required sections before finishing.');
      }
      return true;
    } catch {
      if (identity.current === userId && generation === loadGeneration.current) setSaveError("Couldn't save your answers. They are still here. Check your connection and try again.");
      return false;
    } finally {
      if (identity.current === userId && generation === loadGeneration.current) { saveLock.current = false; setSaving(false); }
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
        answers={acknowledged.current}
        completed={completed}
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
          <Button label={validCompletedSections(answers, completed, questionnaireSections).length + ' of ' + total + ' sections complete · View sections'} variant="ghost" onPress={() => setOverview(true)} disabled={saving} />
          {dirty ? <Text variant="bodySm" tone="muted">Unsaved changes</Text> : null}
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
            {section.description ? <Text variant="bodySm" tone="muted">
              {section.description}
            </Text> : null}
          </View>

          <Card style={{ gap: spacing.lg }}>
            {visibleQuestions(section, answers).map((q) => (
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
      <Sheet role="detail" heightRatio={0.9} visible={overview} onClose={() => setOverview(false)} title="Your coaching assessment">
        <SheetScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: spacing.sm, padding: spacing.base, paddingBottom: spacing['2xl'] }} testID="assessment-section-list">
          <Text variant="bodySm" tone="muted">Explore each section in your own time. A completed section can still be edited.</Text>
          {questionnaireSections.map((entry, target) => <OptionRow key={entry.id} label={entry.title + ' · ' + (validCompletedSections(answers, completed, questionnaireSections).includes(entry.id) ? 'Completed' : 'Not completed')} selected={target === index}
            onPress={() => { setOverview(false); requestExit(() => showSection(target)); }} />)}
        </SheetScrollView>
      </Sheet>
      <Sheet role="choice" visible={Boolean(pendingExit) && dirty} onClose={() => { if (!saving) setPendingExit(null); }} title="Keep your answers?" dismissible={!saving}>
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
