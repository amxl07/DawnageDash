import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  boundWeeklyStep,
  normalizeWeeklyDraft,
  weeklyDraftKey,
  type WeeklyFeedbackDraft,
  type WeeklyFeedbackForm,
} from '@/lib/weekly-feedback';

export type WeeklyDraftStatus = 'idle' | 'saving' | 'saved' | 'error';

type SaveOptions = { immediate?: boolean };
type PendingSave = {
  timer: ReturnType<typeof setTimeout>;
  resolve: (saved: boolean) => void;
};

export function useWeeklyFeedbackDraft(userId: string | undefined) {
  const pendingRef = useRef<PendingSave | null>(null);
  const writeVersionRef = useRef(0);
  const mountedRef = useRef(true);
  const activeUserRef = useRef(userId);
  const [draftStatus, setDraftStatus] = useState<WeeklyDraftStatus>('idle');

  const cancelPending = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    pending.resolve(false);
    pendingRef.current = null;
  }, []);

  const saveDraft = useCallback(
    (form: WeeklyFeedbackForm, step: number, options: SaveOptions = {}): Promise<boolean> => {
      if (!userId) return Promise.resolve(false);

      cancelPending();
      const writeVersion = ++writeVersionRef.current;
      const draft: WeeklyFeedbackDraft = {
        form: { ...form },
        step: boundWeeklyStep(step),
      };
      if (mountedRef.current) setDraftStatus('saving');

      return new Promise<boolean>((resolve) => {
        const write = async () => {
          pendingRef.current = null;
          try {
            await AsyncStorage.setItem(weeklyDraftKey(userId), JSON.stringify(draft));
            if (mountedRef.current && writeVersionRef.current === writeVersion) {
              setDraftStatus('saved');
            }
            resolve(true);
          } catch {
            if (mountedRef.current && writeVersionRef.current === writeVersion) {
              setDraftStatus('error');
            }
            resolve(false);
          }
        };

        if (options.immediate) {
          void write();
          return;
        }

        const timer = setTimeout(() => void write(), 500);
        pendingRef.current = { timer, resolve };
      });
    },
    [cancelPending, userId],
  );

  const loadDraft = useCallback(async (): Promise<WeeklyFeedbackDraft | null> => {
    if (!userId) return null;
    const requestedUserId = userId;
    const key = weeklyDraftKey(userId);
    let raw: string | null;
    try {
      raw = await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
    if (!mountedRef.current || activeUserRef.current !== requestedUserId || !raw) return null;

    try {
      const draft = normalizeWeeklyDraft(JSON.parse(raw));
      if (!draft) await AsyncStorage.removeItem(key).catch(() => {});
      return draft;
    } catch {
      await AsyncStorage.removeItem(key).catch(() => {});
      return null;
    }
  }, [userId]);

  const clearDraft = useCallback(async (): Promise<boolean> => {
    cancelPending();
    writeVersionRef.current += 1;
    if (!userId) {
      if (mountedRef.current) setDraftStatus('idle');
      return true;
    }

    try {
      await AsyncStorage.removeItem(weeklyDraftKey(userId));
      if (mountedRef.current) setDraftStatus('idle');
      return true;
    } catch {
      if (mountedRef.current) setDraftStatus('error');
      return false;
    }
  }, [cancelPending, userId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      writeVersionRef.current += 1;
      cancelPending();
    };
  }, [cancelPending]);

  useEffect(() => {
    activeUserRef.current = userId;
    writeVersionRef.current += 1;
    cancelPending();
    setDraftStatus('idle');
  }, [cancelPending, userId]);

  return { loadDraft, saveDraft, clearDraft, draftStatus };
}
