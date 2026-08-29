import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { FormState } from '@/components/checkin/CheckInForm';

type CheckInDraft = {
  form: FormState;
  step: number;
  savedAt: number;
};

const DRAFT_EXPIRY_MS = 3 * 24 * 60 * 60 * 1000;
const key = (userId: string, date: string) => `check-in-draft:${userId}:${date}`;

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error';

export function useCheckInDraft(userId: string | undefined, date: string) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writeVersionRef = useRef(0);
  const mountedRef = useRef(true);
  const [draftStatus, setDraftStatus] = useState<SaveStatus>('idle');

  const saveDraft = useCallback(
    (form: FormState, step: number) => {
      if (!userId) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const writeVersion = ++writeVersionRef.current;
      const formSnapshot = { ...form };
      setDraftStatus('saving');
      debounceRef.current = setTimeout(async () => {
        debounceRef.current = null;
        const draft: CheckInDraft = { form: formSnapshot, step, savedAt: Date.now() };
        try {
          await AsyncStorage.setItem(key(userId, date), JSON.stringify(draft));
          if (mountedRef.current && writeVersionRef.current === writeVersion) {
            setDraftStatus('saved');
          }
        } catch {
          if (mountedRef.current && writeVersionRef.current === writeVersion) {
            setDraftStatus('error');
          }
        }
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
    writeVersionRef.current += 1;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    if (mountedRef.current) setDraftStatus('idle');
    await AsyncStorage.removeItem(key(userId, date)).catch(() => {});
  }, [date, userId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      writeVersionRef.current += 1;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = null;
    };
  }, []);

  useEffect(() => {
    writeVersionRef.current += 1;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    setDraftStatus('idle');
  }, [date, userId]);

  return { saveDraft, loadDraft, clearDraft, draftStatus };
}
