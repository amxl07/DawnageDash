import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useRef } from 'react';

import type { FormState } from '@/components/checkin/CheckInForm';

type CheckInDraft = {
  form: FormState;
  step: number;
  savedAt: number;
};

const DRAFT_EXPIRY_MS = 3 * 24 * 60 * 60 * 1000;
const key = (userId: string, date: string) => `check-in-draft:${userId}:${date}`;

export function useCheckInDraft(userId: string | undefined, date: string) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveDraft = useCallback(
    (form: FormState, step: number) => {
      if (!userId) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const draft: CheckInDraft = { form, step, savedAt: Date.now() };
        AsyncStorage.setItem(key(userId, date), JSON.stringify(draft)).catch(() => {});
      }, 500);
    },
    [date, userId],
  );

  const loadDraft = useCallback(async (): Promise<CheckInDraft | null> => {
    if (!userId) return null;
    try {
      const raw = await AsyncStorage.getItem(key(userId, date));
      if (!raw) return null;
      const draft = JSON.parse(raw) as CheckInDraft;
      if (Date.now() - draft.savedAt > DRAFT_EXPIRY_MS) {
        await AsyncStorage.removeItem(key(userId, date));
        return null;
      }
      return draft;
    } catch {
      return null;
    }
  }, [date, userId]);

  const clearDraft = useCallback(async () => {
    if (!userId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    await AsyncStorage.removeItem(key(userId, date)).catch(() => {});
  }, [date, userId]);

  return { saveDraft, loadDraft, clearDraft };
}
