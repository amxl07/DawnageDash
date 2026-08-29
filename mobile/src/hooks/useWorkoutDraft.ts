import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { WorkoutExercise } from '@/features/workout/workoutReducer';

export type DraftExercise = WorkoutExercise;

export type DraftData = {
  workoutTitle: string;
  exercises: DraftExercise[];
  selectedPlanId: string;
  existingLogId: string | null;
  savedAt: number;
};

const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000;

const key = (userId: string, date: string) => `workout-draft:${userId}:${date}`;

/** Port of useWorkoutDraft onto AsyncStorage (sessionStorage has no RN analogue). */
export function useWorkoutDraft(userId: string | undefined, dateKey: string) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const saveDraftNow = useCallback(
    async (data: Omit<DraftData, 'savedAt'>) => {
      if (!userId) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setDraftStatus('saving');
      const draft: DraftData = { ...data, savedAt: Date.now() };
      try {
        await AsyncStorage.setItem(key(userId, dateKey), JSON.stringify(draft));
        setDraftStatus('saved');
      } catch {
        setDraftStatus('error');
      }
    },
    [userId, dateKey],
  );

  const saveDraft = useCallback(
    (data: Omit<DraftData, 'savedAt'>) => {
      if (!userId) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setDraftStatus('saving');
      debounceRef.current = setTimeout(() => {
        void saveDraftNow(data);
      }, 500);
    },
    [saveDraftNow, userId],
  );

  const loadDraft = useCallback(async (): Promise<DraftData | null> => {
    if (!userId) return null;
    try {
      const raw = await AsyncStorage.getItem(key(userId, dateKey));
      if (!raw) return null;
      const draft: DraftData = JSON.parse(raw);
      if (Date.now() - draft.savedAt > DRAFT_EXPIRY_MS) {
        await AsyncStorage.removeItem(key(userId, dateKey));
        return null;
      }
      return draft;
    } catch {
      return null;
    }
  }, [userId, dateKey]);

  const clearDraft = useCallback(async () => {
    if (!userId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    await AsyncStorage.removeItem(key(userId, dateKey)).catch(() => {});
    setDraftStatus('idle');
  }, [userId, dateKey]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  return { saveDraft, saveDraftNow, loadDraft, clearDraft, draftStatus };
}
