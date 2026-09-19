import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { clearCheckInDraftIfUnchanged, useCheckInDraft } from '@/hooks/useCheckInDraft';
import { useCheckInMutation } from '@/hooks/useCheckInMutation';
import { useDailyCheckIns } from '@/hooks/useDashboardData';
import { validateCheckIn } from '@/lib/checkin-validation';
import { isDateKeyStrict, localDateString } from '@/lib/dates';
import type { DeliveryFailure } from '@/lib/delivery-errors';
import type { DailyCheckIn } from '@/types/db';
import { readCheckInOutbox, subscribeCheckInDelivery, type CheckInDeliveryEvent } from './checkInOutbox';
import { useNumericCommits } from './components/NumericCommitProvider';
import { localCheckInDays, type LocalCheckInDay } from './dateHistory';
import { CHECK_IN_FIELDS } from './config/fields';
import { EMPTY_FORM, fromRow, toPayload, type FormState } from './model';

export type CheckInSubmitResult = 'synced' | 'queued' | 'blocked' | 'invalid' | 'storage-error';
export type CheckInReceiptData = { date: string; form: FormState; status: 'queued' | 'synced'; generation: number };
type EditorState = {
  form: FormState;
  errors: Partial<Record<keyof FormState, string>>;
  loadState: 'loading' | 'ready' | 'error';
  deliveryState: 'idle' | 'sending' | 'queued' | 'synced' | 'blocked';
  generation: number;
  submittedGeneration: number | null;
  isSubmitting: boolean;
  hasEdits: boolean;
  step: number;
  receipt: CheckInReceiptData | null;
  failure: DeliveryFailure | null;
  recoveryMessage: string | null;
  canStartLocal: boolean;
  hasPendingNumericEdits: boolean;
  localRecords: LocalCheckInDay[];
};
const initialState = (): EditorState => ({ form: { ...EMPTY_FORM }, errors: {}, loadState: 'loading', deliveryState: 'idle', generation: 0, submittedGeneration: null, isSubmitting: false, hasEdits: false, step: 0, receipt: null, failure: null, recoveryMessage: null, canStartLocal: false, hasPendingNumericEdits: false, localRecords: [] });
type Scope = { pendingNumeric: number; dateRequest: number; localRecords: LocalCheckInDay[]; userId: string | undefined; date: string; form: FormState; baseline: FormState; receipt: CheckInReceiptData | null; generation: number; dirty: boolean; loaded: boolean; step: number; lock: Promise<CheckInSubmitResult> | null };

export function useCheckInEditor(initialDate: string) {
  const { user } = useAuth();
  const commits = useNumericCommits();
  // Reporting identity never follows a ticking clock or a changed prop implicitly.
  const [date, setDate] = useState(initialDate);
  const scope = useMemo<Scope>(() => ({ pendingNumeric: 0, dateRequest: 0, localRecords: [], userId: user?.id, date, form: { ...EMPTY_FORM }, baseline: { ...EMPTY_FORM }, receipt: null, generation: 0, dirty: false, loaded: false, step: 0, lock: null }), [user?.id, date]);
  const current = useRef<Scope | null>(scope);
  current.current = scope;
  const [stored, setStored] = useState<{ scope: Scope; state: EditorState }>(() => ({ scope, state: initialState() }));
  const state = stored.scope === scope ? stored.state : initialState();
  const [retry, setRetry] = useState(0);
  const query = useDailyCheckIns();
  const { mutateAsync } = useCheckInMutation();
  const { refetch } = query;
  const { loadDraft, saveDraft, saveDraftNow, clearDraft, draftStatus } = useCheckInDraft(user?.id, date);
  const publish = useCallback((patch: Partial<EditorState>) => {
    if (current.current !== scope) return;
    setStored((previous) => ({ scope, state: { ...(previous.scope === scope ? previous.state : initialState()), ...patch } }));
  }, [scope]);

  useEffect(() => {
    current.current = scope;
    return () => { if (current.current === scope) current.current = null; };
  }, [scope]);

  useEffect(() => commits?.subscribe(({ pending, edited }) => {
    if (current.current !== scope) return;
    scope.pendingNumeric = pending;
    if (edited && scope.loaded) { scope.generation += 1; scope.dirty = true; }
    publish({ hasPendingNumericEdits: pending > 0, generation: scope.generation, hasEdits: scope.dirty });
  }), [commits, scope, publish]);

  useEffect(() => {
    if (scope.loaded) return;
    let active = true;
    if (!scope.userId || !isDateKeyStrict(date) || date > localDateString()) {
      publish({ loadState: 'error', recoveryMessage: 'Choose a valid reporting date on or before today.' });
      return;
    }
    publish({ loadState: 'loading', recoveryMessage: null });
    void (async () => {
      try {
        const [draft, queued] = await Promise.all([loadDraft(), readCheckInOutbox(scope.userId!)]);
        if (!active || current.current !== scope || scope.loaded) return;
        scope.localRecords = localCheckInDays(queued);
        publish({ localRecords: scope.localRecords });
        const intent = queued.find((item) => item.payload.date === date);
        if (!draft && !intent && query.isLoading && query.data === undefined && query.fetchStatus !== 'paused') return;
        if (!draft && !intent && (query.isError || query.fetchStatus === 'paused') && query.data === undefined) {
          publish({ loadState: 'error', canStartLocal: true, recoveryMessage: 'Your saved records are unavailable. Retry, or start a local record for this date. When it syncs, it may update an existing record for the same day.' });
          return;
        }
        const row = query.data?.find((record) => record.date === date);
        const submitted = intent ? fromRow(intent.payload as DailyCheckIn) : row ? fromRow(row) : null;
        const form = draft?.form ?? submitted ?? { ...EMPTY_FORM };
        scope.form = { ...form };
        scope.baseline = { ...(submitted ?? EMPTY_FORM) };
        scope.generation = draft ? 1 : 0;
        scope.dirty = !!draft;
        scope.step = draft?.step ?? 0;
        scope.loaded = true;
        const deliveryState = intent ? intent.failure && !intent.failure.retryable ? 'blocked' : 'queued' : row ? 'synced' : 'idle';
        scope.receipt = submitted && deliveryState !== 'blocked' ? { date, form: submitted, status: deliveryState === 'queued' ? 'queued' : 'synced', generation: 0 } : null;
        publish({
          form: scope.form, loadState: 'ready', generation: scope.generation, hasEdits: scope.dirty, step: scope.step,
          deliveryState, failure: intent?.failure ?? null,
          submittedGeneration: submitted ? 0 : null,
          receipt: scope.receipt,
          recoveryMessage: draft && intent ? 'A newer local draft is open. The previously submitted version is also saved on this device.' : null,
        });
      } catch {
        if (active) publish({ loadState: 'error', recoveryMessage: 'The local record could not be read. Your stored draft has been kept. Retry to recover it.' });
      }
    })();
    return () => { active = false; };
  }, [scope, date, loadDraft, query.data, query.isLoading, query.isError, query.fetchStatus, publish, retry]);

  const refreshDelivery = useCallback(async (event?: CheckInDeliveryEvent) => {
    const receipt = scope.receipt;
    if (!scope.userId || !scope.loaded) return;
    try {
      const queued = await readCheckInOutbox(scope.userId);
      if (current.current !== scope) return;
      scope.localRecords = localCheckInDays(queued);
      publish({ localRecords: scope.localRecords });
      if (!receipt || scope.receipt !== receipt || scope.lock) return;
      const intent = queued.find((item) => item.payload.date === scope.date);
      if (intent) {
        const blocked = intent.failure && !intent.failure.retryable;
        publish({ deliveryState: blocked ? 'blocked' : 'queued', failure: blocked ? intent.failure : null });
        return;
      }
      if (event?.status === 'synced' && JSON.stringify(event.payload) === JSON.stringify(toPayload(receipt.form, scope.date))) {
        scope.receipt = { ...receipt, status: 'synced' };
        publish({ deliveryState: 'synced', receipt: scope.receipt, failure: null });
        return;
      }
      const row = query.data?.find((record) => record.date === scope.date);
      if (row && JSON.stringify(toPayload(fromRow(row), scope.date)) === JSON.stringify(toPayload(receipt.form, scope.date))) {
        scope.receipt = { ...receipt, status: 'synced' };
        publish({ deliveryState: 'synced', receipt: scope.receipt, failure: null });
      }
    } catch {
      publish({ recoveryMessage: 'Delivery status could not be checked. The previously acknowledged record is still shown.' });
    }
  }, [scope, query.data, publish]);
  useEffect(() => { if (scope.loaded) void refreshDelivery(); }, [scope, query.data, refreshDelivery]);
  useEffect(() => subscribeCheckInDelivery((event) => {
    if (event.userId !== scope.userId || event.date !== scope.date) return;
    void refreshDelivery(event);
  }), [scope, refreshDelivery]);

  /** Synchronous sink: NumericCommitProvider.flush() may call this immediately before submit(). */
  const updateForm = useCallback((updater: (previous: FormState) => FormState) => {
    if (current.current !== scope || !scope.loaded) return;
    const next = updater(scope.form);
    if (CHECK_IN_FIELDS.every(({ id }) => Object.is(next[id], scope.form[id]))) return;
    scope.form = { ...next };
    scope.generation += 1;
    scope.dirty = true;
    publish({ form: scope.form, generation: scope.generation, hasEdits: true, errors: {} });
    saveDraft(scope.form, scope.step);
  }, [scope, publish, saveDraft]);
  const setField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => updateForm((previous) => ({ ...previous, [field]: value })), [updateForm]);
  const setStep = useCallback((step: number) => {
    scope.step = Math.max(0, Math.min(3, step));
    publish({ step: scope.step });
    if (scope.dirty) saveDraft(scope.form, scope.step);
  }, [scope, publish, saveDraft]);
  const getSnapshot = useCallback(() => ({ ...scope.form }), [scope]);

  const flushDraft = useCallback(async (): Promise<boolean> => {
    if (current.current !== scope || !scope.loaded) return false;
    if (commits?.flush() === false) return false;
    if (!scope.dirty) return true;
    // An edit can occur during a disk write. A controlled exit needs the latest acknowledgment.
    let generation: number;
    do {
      if (commits?.flush() === false) return false;
      generation = scope.generation;
      if (!await saveDraftNow(scope.form, scope.step)) {
        publish({ recoveryMessage: 'Your changes could not be saved on this device. Stay here and retry, or deliberately discard them.' });
        return false;
      }
      if (current.current !== scope) return false;
    } while (generation !== scope.generation || scope.pendingNumeric > 0);
    return true;
  }, [scope, saveDraftNow, publish, commits]);

  const submit = useCallback((): Promise<CheckInSubmitResult> => {
    if (scope.lock) return scope.lock;
    if (current.current !== scope || !scope.loaded || commits?.flush() === false) return Promise.resolve('invalid');
    const snapshot = { ...scope.form };
    const validation = validateCheckIn(snapshot);
    if (Object.keys(validation.errors).length) {
      publish({ errors: validation.errors });
      return Promise.resolve('invalid');
    }
    const generation = scope.generation;
    publish({ errors: {}, isSubmitting: true, deliveryState: 'sending', recoveryMessage: null, failure: null });
    // Defer one microtask so the promise lock exists even for an immediately resolving adapter.
    const operation = Promise.resolve().then(async (): Promise<CheckInSubmitResult> => {
      try {
        const result = await mutateAsync(toPayload(snapshot, scope.date));
        const status = result.status === 'offline' ? 'queued' : result.status;
        if (current.current !== scope) {
          if (status !== 'blocked' && scope.userId && scope.generation === generation) {
            await clearCheckInDraftIfUnchanged(scope.userId, scope.date, snapshot);
          }
          return status;
        }
        scope.localRecords = scope.localRecords.filter((record) => record.date !== scope.date);
        if (status !== 'synced') scope.localRecords.push({ date: scope.date, status });
        publish({ localRecords: scope.localRecords });
        if (status === 'blocked') {
          publish({ deliveryState: 'blocked', failure: result.status === 'blocked' ? result.failure : null });
          if (scope.dirty) { commits?.flush({ preserveEditing: true }); await saveDraftNow(scope.form, scope.step); }
          return 'blocked';
        }
        scope.baseline = snapshot;
        scope.receipt = { date: scope.date, form: snapshot, status, generation };
        publish({ deliveryState: status, submittedGeneration: generation, receipt: { date: scope.date, form: snapshot, status, generation } });
        if (scope.generation === generation && scope.pendingNumeric === 0) {
          const cleared = await clearDraft();
          if (current.current !== scope) return status;
          if (cleared && scope.generation === generation && scope.pendingNumeric === 0) {
            scope.dirty = false;
            publish({ hasEdits: false });
          } else if (!cleared) {
            publish({ recoveryMessage: 'The submitted record is saved, but its local draft could not be cleared. Your values are still here.' });
          }
        }
        if (scope.generation !== generation) {
          // Keep a newer complete number durable without ending its editing session.
          // Invalid/unfinished text remains open and explicitly unsaved.
          commits?.flush({ preserveEditing: true });
          await saveDraftNow(scope.form, scope.step);
        }
        return status;
      } catch {
        publish({ deliveryState: 'idle', recoveryMessage: 'The record could not be saved on this device. Your values are still here. Retry saving.' });
        return 'storage-error';
      } finally {
        scope.lock = null;
        publish({ isSubmitting: false });
      }
    });
    scope.lock = operation;
    return operation;
  }, [scope, publish, mutateAsync, clearDraft, saveDraftNow, commits]);

  const requestDateChange = useCallback(async (nextDate: string, isCurrent: () => boolean = () => true): Promise<boolean> => {
    const request = ++scope.dateRequest;
    if (!isDateKeyStrict(nextDate) || nextDate > localDateString() || !isCurrent()) return false;
    if (nextDate === scope.date) return true;
    if (scope.loaded && !await flushDraft()) return false;
    if (current.current !== scope || request !== scope.dateRequest || !isCurrent()) return false;
    setDate(nextDate);
    return true;
  }, [scope, flushDraft]);
  const discardDraft = useCallback(async (): Promise<boolean> => {
    if (scope.lock) return false;
    const generation = scope.generation;
    if (!await clearDraft() || current.current !== scope) return false;
    if (scope.generation !== generation) { await saveDraftNow(scope.form, scope.step); return false; }
    scope.dirty = false;
    scope.form = { ...scope.baseline };
    commits?.reset(Object.fromEntries(CHECK_IN_FIELDS.flatMap(({ id, label }) => {
      const value = scope.form[id];
      return value === null || typeof value === 'number' ? [[label, value]] : [];
    })));
    scope.pendingNumeric = 0;
    scope.generation += 1;
    publish({ form: scope.form, generation: scope.generation, hasEdits: false, hasPendingNumericEdits: false, errors: {}, recoveryMessage: null });
    return true;
  }, [scope, clearDraft, saveDraftNow, publish, commits]);
  const startLocalDraft = useCallback(() => {
    if (current.current !== scope || scope.loaded || !state.canStartLocal) return;
    scope.loaded = true;
    publish({ loadState: 'ready', canStartLocal: false, form: scope.form, recoveryMessage: 'This local record was started while saved history was unavailable. Its reporting date will be preserved when it syncs.' });
  }, [scope, state.canStartLocal, publish]);
  const retryLoad = useCallback(() => { void refetch(); setRetry((value) => value + 1); }, [refetch]);
  const firstInvalidField = CHECK_IN_FIELDS.find(({ id }) => state.errors[id])?.id ?? null;
  const draftState = draftStatus === 'saving' ? 'writing' : draftStatus === 'saved' ? 'saved' : draftStatus === 'error' ? 'error' : 'clean';

  return { ...state, date, draftState: draftState as 'clean' | 'writing' | 'saved' | 'error', setField, updateForm, getSnapshot, submit, flushDraft, requestDateChange, discardDraft, retryLoad, startLocalDraft, refreshDelivery, setStep, firstInvalidField, checkIns: query.data, historyIsStale: query.isError, existing: query.data?.find((row) => row.date === date) ?? null };
}
export type CheckInEditor = ReturnType<typeof useCheckInEditor>;
