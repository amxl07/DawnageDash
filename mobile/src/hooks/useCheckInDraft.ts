import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { EMPTY_FORM, type FormState } from '@/features/checkin/model';
import { isDateKeyStrict } from '@/lib/dates';

export type CheckInDraft = { form: FormState; step: number; savedAt: number };
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error';
export const DRAFT_EXPIRY_MS = 3 * 24 * 60 * 60 * 1000;
const key = (userId: string, date: string) => `check-in-draft:${userId}:${date}`;

// Shared across hook instances: a late old write must never resurrect a cleared draft.
const queues = new Map<string, Promise<unknown>>();
function serial<T>(name: string, operation: () => Promise<T>): Promise<T> {
  const next = (queues.get(name) ?? Promise.resolve()).catch(() => {}).then(operation);
  queues.set(name, next);
  void next.finally(() => { if (queues.get(name) === next) queues.delete(name); }).catch(() => {});
  return next;
}

function decode(raw: string): CheckInDraft {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error('Unreadable check-in draft.');
  const draft = value as CheckInDraft;
  if (!draft.form || typeof draft.form !== 'object' || !Number.isFinite(draft.savedAt) ||
      !Number.isInteger(draft.step) || draft.step < 0 || draft.step > 3) {
    throw new Error('Unreadable check-in draft.');
  }
  // Preserve the established unversioned storage shape and all sixteen values.
  for (const field of Object.keys(EMPTY_FORM) as (keyof FormState)[]) {
    const answer = draft.form[field];
    if (field === 'notes') {
      if (typeof answer !== 'string') throw new Error('Unreadable check-in notes.');
    } else if (field === 'workoutStatus' || field === 'digestion') {
      const options = field === 'workoutStatus' ? ['done', 'no', 'cardio_day', 'rest_day'] : ['none', 'bloated', 'constipated', 'diarrhea'];
      if (answer !== null && !options.includes(answer as string)) throw new Error('Unreadable check-in choice.');
    } else if (answer !== null && (typeof answer !== 'number' || !Number.isFinite(answer))) {
      throw new Error('Unreadable check-in number.');
    }
  }
  return draft;
}

/** Missing/expired is null. Storage and malformed data deliberately reject. */
export function readCheckInDraft(userId: string, date: string): Promise<CheckInDraft | null> {
  if (!isDateKeyStrict(date)) return Promise.reject(new Error('Invalid reporting date.'));
  const name = key(userId, date);
  return serial(name, async () => {
    const raw = await AsyncStorage.getItem(name);
    if (raw === null) return null;
    const draft = decode(raw);
    if (Date.now() - draft.savedAt > DRAFT_EXPIRY_MS) {
      await AsyncStorage.removeItem(name);
      return null;
    }
    return draft;
  });
}

/** Cleanup for an inactive editor: compare under the key's write lock before removing. */
export function clearCheckInDraftIfUnchanged(userId: string, date: string, expected: FormState): Promise<boolean> {
  const name = key(userId, date);
  return serial(name, async () => {
    const raw = await AsyncStorage.getItem(name);
    if (raw === null) return true;
    const draft = decode(raw);
    if (!(Object.keys(EMPTY_FORM) as (keyof FormState)[]).every((field) => Object.is(draft.form[field], expected[field]))) return false;
    await AsyncStorage.removeItem(name);
    return true;
  }).catch(() => false);
}

type DraftMetadata = { date: string; savedAt: number };
const discovery = new Map<string, Promise<DraftMetadata | null>>();
/** Call on focus, not during render. Concurrent focus readers share one account scan. */
export function findLatestCheckInDraft(userId: string): Promise<DraftMetadata | null> {
  const inFlight = discovery.get(userId);
  if (inFlight) return inFlight;
  const scan = (async () => {
    const prefix = `check-in-draft:${userId}:`;
    const keys = await AsyncStorage.getAllKeys();
    const dates = keys.filter((name) => name.startsWith(prefix)).map((name) => name.slice(prefix.length)).filter(isDateKeyStrict);
    const drafts = await Promise.all(dates.map(async (date) => {
      const draft = await readCheckInDraft(userId, date);
      return draft ? { date, savedAt: draft.savedAt } : null;
    }));
    return drafts.filter((draft): draft is DraftMetadata => draft !== null).sort((a, b) => b.savedAt - a.savedAt)[0] ?? null;
  })();
  discovery.set(userId, scan);
  void scan.finally(() => { if (discovery.get(userId) === scan) discovery.delete(userId); }).catch(() => {});
  return scan;
}

type Scope = { name: string | null; version: number; timer: ReturnType<typeof setTimeout> | null; pending: CheckInDraft | null };
export function useCheckInDraft(userId: string | undefined, date: string) {
  const scope = useMemo<Scope>(() => ({ name: userId ? key(userId, date) : null, version: 0, timer: null, pending: null }), [userId, date]);
  const current = useRef<Scope | null>(scope);
  current.current = scope;
  const [status, setStatus] = useState<{ scope: Scope; value: SaveStatus }>({ scope, value: 'idle' });
  const publish = useCallback((version: number, value: SaveStatus) => {
    if (current.current === scope && scope.version === version) setStatus({ scope, value });
  }, [scope]);

  const write = useCallback(async (draft: CheckInDraft, version: number): Promise<boolean> => {
    if (!scope.name) return false;
    try {
      await serial(scope.name, () => AsyncStorage.setItem(scope.name!, JSON.stringify(draft)));
      publish(version, 'saved');
      return true;
    } catch {
      publish(version, 'error');
      return false;
    }
  }, [scope, publish]);

  const saveDraftNow = useCallback((form: FormState, step: number): Promise<boolean> => {
    if (scope.timer) clearTimeout(scope.timer);
    scope.timer = null;
    scope.pending = null;
    const version = ++scope.version;
    publish(version, 'saving');
    return write({ form: { ...form }, step, savedAt: Date.now() }, version);
  }, [scope, publish, write]);

  const saveDraft = useCallback((form: FormState, step: number) => {
    if (!scope.name) return;
    if (scope.timer) clearTimeout(scope.timer);
    const version = ++scope.version;
    scope.pending = { form: { ...form }, step, savedAt: Date.now() };
    publish(version, 'saving');
    scope.timer = setTimeout(() => {
      scope.timer = null;
      const draft = scope.pending;
      scope.pending = null;
      if (draft) void write(draft, version);
    }, 500);
  }, [scope, publish, write]);

  const clearDraft = useCallback(async (): Promise<boolean> => {
    if (!scope.name) return false;
    if (scope.timer) clearTimeout(scope.timer);
    scope.timer = null;
    scope.pending = null;
    const version = ++scope.version;
    try {
      await serial(scope.name, () => AsyncStorage.removeItem(scope.name!));
      publish(version, 'idle');
      return true;
    } catch {
      publish(version, 'error');
      return false;
    }
  }, [scope, publish]);

  const loadDraft = useCallback(() => userId ? readCheckInDraft(userId, date) : Promise.resolve(null), [userId, date]);
  useEffect(() => {
    current.current = scope;
    return () => {
      if (current.current === scope) current.current = null;
      if (scope.timer) clearTimeout(scope.timer);
      scope.timer = null;
      const draft = scope.pending;
      scope.pending = null;
      // Best effort at unmount/account change; controlled exits await saveDraftNow.
      if (draft) void write(draft, scope.version);
    };
  }, [scope, write]);

  return { saveDraft, saveDraftNow, loadDraft, clearDraft, draftStatus: status.scope === scope ? status.value : 'idle' as SaveStatus };
}
