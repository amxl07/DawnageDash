import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

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
  const identity = useMemo(() => ({ userId }), [userId]);
  const activeIdentityRef = useRef(identity);
  const pendingRef = useRef<PendingSave | null>(null);
  const operationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const operationVersionRef = useRef(0);
  const mountedRef = useRef(true);
  const [draftStatus, setDraftStatus] = useState<WeeklyDraftStatus>('idle');

  const cancelPending = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    pending.resolve(false);
    pendingRef.current = null;
  }, []);

  const enqueueStorage = useCallback(<T,>(operation: () => Promise<T>): Promise<T> => {
    const result = operationQueueRef.current.then(operation, operation);
    operationQueueRef.current = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }, []);

  const saveDraft = useCallback(
    (form: WeeklyFeedbackForm, step: number, options: SaveOptions = {}): Promise<boolean> => {
      if (!userId || !mountedRef.current || activeIdentityRef.current !== identity) {
        return Promise.resolve(false);
      }

      cancelPending();
      const operationVersion = ++operationVersionRef.current;
      const draft: WeeklyFeedbackDraft = {
        form: { ...form },
        step: boundWeeklyStep(step),
      };
      if (mountedRef.current && activeIdentityRef.current === identity) {
        setDraftStatus('saving');
      }

      const write = () =>
        enqueueStorage(async () => {
          const isCurrent = () =>
            mountedRef.current &&
            activeIdentityRef.current === identity &&
            operationVersionRef.current === operationVersion;

          // A queued-but-not-started operation can be dropped. Once setItem has
          // started it is allowed to finish, and all later mutations wait for it.
          if (!isCurrent()) return false;
          try {
            await AsyncStorage.setItem(weeklyDraftKey(userId), JSON.stringify(draft));
            if (!isCurrent()) return false;
            setDraftStatus('saved');
            return true;
          } catch {
            if (!isCurrent()) return false;
            setDraftStatus('error');
            return false;
          }
        });

      if (options.immediate) return write();

      return new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => {
          pendingRef.current = null;
          void write().then(resolve);
        }, 500);
        pendingRef.current = { timer, resolve };
      });
    },
    [cancelPending, enqueueStorage, identity, userId],
  );

  const loadDraft = useCallback(async (): Promise<WeeklyFeedbackDraft | null> => {
    if (!userId) return null;
    const key = weeklyDraftKey(userId);
    const loadVersion = operationVersionRef.current;
    let raw: string | null;
    try {
      raw = await AsyncStorage.getItem(key);
    } catch {
      return null;
    }

    const isCurrent = () =>
      mountedRef.current &&
      activeIdentityRef.current === identity &&
      operationVersionRef.current === loadVersion;
    if (!isCurrent() || !raw) return null;

    try {
      const draft = normalizeWeeklyDraft(JSON.parse(raw));
      if (!draft) {
        await enqueueStorage(async () => {
          if (isCurrent()) await AsyncStorage.removeItem(key).catch(() => {});
        });
      }
      return isCurrent() ? draft : null;
    } catch {
      await enqueueStorage(async () => {
        if (isCurrent()) await AsyncStorage.removeItem(key).catch(() => {});
      });
      return null;
    }
  }, [enqueueStorage, identity, userId]);

  const clearDraft = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      const isCurrent = mountedRef.current && activeIdentityRef.current === identity;
      if (isCurrent) setDraftStatus('idle');
      return isCurrent;
    }

    if (!mountedRef.current || activeIdentityRef.current !== identity) {
      return enqueueStorage(async () => {
        await AsyncStorage.removeItem(weeklyDraftKey(userId)).catch(() => {});
        return false;
      });
    }

    cancelPending();
    const operationVersion = ++operationVersionRef.current;

    return enqueueStorage(async () => {
      try {
        await AsyncStorage.removeItem(weeklyDraftKey(userId));
        const isCurrent =
          mountedRef.current &&
          activeIdentityRef.current === identity &&
          operationVersionRef.current === operationVersion;
        if (isCurrent) setDraftStatus('idle');
        return isCurrent;
      } catch {
        const isCurrent =
          mountedRef.current &&
          activeIdentityRef.current === identity &&
          operationVersionRef.current === operationVersion;
        if (isCurrent) setDraftStatus('error');
        return false;
      }
    });
  }, [cancelPending, enqueueStorage, identity, userId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      operationVersionRef.current += 1;
      cancelPending();
    };
  }, [cancelPending]);

  useLayoutEffect(() => {
    activeIdentityRef.current = identity;
    operationVersionRef.current += 1;
    cancelPending();
    setDraftStatus('idle');
  }, [cancelPending, identity]);

  return { loadDraft, saveDraft, clearDraft, draftStatus };
}
