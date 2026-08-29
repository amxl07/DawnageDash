import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';

import { Button, Card, ErrorState, ProgressBar, Screen, SkeletonCard, Text } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { questionnaireSections } from '@/lib/questionnaire-data';
import { supabase } from '@/lib/supabase';
import { spacing } from '@/theme';
import { QuestionField } from './QuestionField';
import { QuestionnaireSummary } from './QuestionnaireSummary';

type Answers = Record<string, string | number>;

export function QuestionnaireWizard() {
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [completed, setCompleted] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSummary, setShowSummary] = useState(false);

  const section = questionnaireSections[index];
  const total = questionnaireSections.length;

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setLoadError(false);
    try {
      const { data, error } = await supabase
        .from('onboarding_questionnaire')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;

      if (data) {
        const parsedAnswers = JSON.parse((data.answers as string) || '{}');
        const parsedCompleted: string[] = JSON.parse((data.completed_sections as string) || '[]');
        setAnswers(parsedAnswers);
        setCompleted(parsedCompleted);
        if (data.status === 'completed') {
          setShowSummary(true);
        } else {
          // Resume at the first section they haven't finished.
          const firstIncomplete = questionnaireSections.findIndex(
            (s) => !parsedCompleted.includes(s.id),
          );
          setIndex(firstIncomplete === -1 ? 0 : firstIncomplete);
        }
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Check-then-update/insert — there is no unique constraint on user_id. */
  const persist = useCallback(
    async (nextAnswers: Answers, nextCompleted: string[]) => {
      if (!user?.id) return;
      const payload = {
        user_id: user.id,
        answers: JSON.stringify(nextAnswers),
        completed_sections: JSON.stringify(nextCompleted),
        status: nextCompleted.length === total ? 'completed' : 'in_progress',
      };
      const { data: existing } = await supabase
        .from('onboarding_questionnaire')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

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
    },
    [user?.id, total],
  );

  const save = async (advance: boolean) => {
    if (advance) {
      const missing = section.questions.filter((q) => q.required && !answers[q.id]);
      if (missing.length) {
        setErrors(Object.fromEntries(missing.map((q) => [q.id, 'This question is required.'])));
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        AccessibilityInfo.announceForAccessibility(
          `${missing.length} required question${missing.length > 1 ? 's' : ''} still need an answer.`,
        );
        return;
      }
    }
    setErrors({});
    setSaving(true);
    setSaveError(null);
    try {
      const nextCompleted = advance
        ? Array.from(new Set([...completed, section.id]))
        : completed;
      await persist(answers, nextCompleted);
      setCompleted(nextCompleted);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (!advance) {
        AccessibilityInfo.announceForAccessibility('Draft saved.');
      } else if (index < total - 1) {
        setIndex(index + 1);
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      } else {
        setShowSummary(true);
      }
    } catch {
      setSaveError("Couldn't save your answers. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const progress = useMemo(() => (index + 1) / total, [index, total]);

  if (loading) {
    return (
      <Screen>
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
        onEdit={() => {
          setShowSummary(false);
          setIndex(0);
        }}
      />
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Screen ref={scrollRef}>
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" tone="muted">
            Section {index + 1} of {total}
          </Text>
          <ProgressBar
            value={progress}
            accessibilityLabel={`Assessment progress, section ${index + 1} of ${total}`}
          />
        </View>

        <View style={{ gap: spacing.xs, marginTop: spacing.lg }}>
          <Text variant="h1">{section.title}</Text>
          <Text variant="bodySm" tone="muted">
            {section.description}
          </Text>
        </View>

        <Card style={{ marginTop: spacing.lg, gap: spacing.lg }}>
          {section.questions.map((q) => (
            <QuestionField
              key={q.id}
              question={q}
              value={answers[q.id]}
              error={errors[q.id]}
              onChange={(v) => {
                setAnswers((prev) => ({ ...prev, [q.id]: v }));
                setErrors((prev) => ({ ...prev, [q.id]: '' }));
              }}
            />
          ))}
        </Card>

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
              onPress={() => setIndex(index - 1)}
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
          style={{ marginTop: spacing.sm }}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
