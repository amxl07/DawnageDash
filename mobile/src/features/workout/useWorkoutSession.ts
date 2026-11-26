import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { parsePointer, useUserProfile, useWorkoutPlan } from '@/hooks/usePlans';
import { readWorkoutDraft, useWorkoutDraft, type DraftData } from '@/hooks/useWorkoutDraft';
import { associateWorkoutOutbox, readOutbox, retryWorkoutRecovery, saveWorkoutLog, subscribeWorkoutDelivery, type OutboxItem, type WorkoutReceipt, type WorkoutRecoveryResult } from '@/lib/outbox';
import { supabase } from '@/lib/supabase';
import { parseWorkoutContent } from '@/lib/workout-content';
import { createDraftExerciseFromPlan, initialWorkoutState, workoutReducer, type WorkoutExercise, type WorkoutState } from './workoutReducer';
import { acquireWorkoutSave, applyWorkoutEdit, attachPersistedWorkoutId, finalizeWorkoutSave, releaseWorkoutSave, serializeWorkoutExercises, type WorkoutEditAction, type WorkoutEditSnapshot } from './workoutSave';
import { resolveWorkoutEntry, type WorkoutEntry, type WorkoutScope } from './workout-entry';

export type WorkoutSession = {
  scope: WorkoutScope;
  entry: WorkoutEntry;
  state: WorkoutState;
  draftState: 'clean' | 'writing' | 'saved' | 'error';
  deliveryState: 'idle' | 'sending' | 'queued' | 'synced' | 'blocked';
  edit: (action: WorkoutEditAction) => boolean;
  save: () => Promise<'synced' | 'queued' | 'blocked' | 'invalid' | 'storage-error'>;
  flushDraft: () => Promise<boolean>;
};
type Row = { id: string; title: string | null; content: string; date: string };
type Local = { draft: DraftData | null; queued: OutboxItem | null; related?: OutboxItem[] };
type ReceiptState = { receipt: WorkoutReceipt; status: 'queued' | 'synced' | 'blocked' };
type SourceProtection = { sourceKind: 'structured' | 'text' | 'unknown'; legacyText?: string };
const asDraft = (state: WorkoutState, protection: SourceProtection): Omit<DraftData, 'savedAt'> => ({ workoutTitle: state.title, exercises: state.exercises, selectedPlanId: String(state.selectedDay ?? 'custom'), existingLogId: state.existingLogId, ...protection });

/** Normalize all supported structured readers without silently dropping legacy values. */
export function exercisesFromContent(content: string): { exercises: WorkoutExercise[]; day: number | null; text?: string } {
  const parsed = parseWorkoutContent(content);
  if (parsed.kind === 'text') return { exercises: [], day: null, text: parsed.text };
  return {
    day: parsed.planDayNumber ?? null,
    exercises: parsed.exercises.map((exercise, i) => {
      const id = `exercise-${i + 1}`;
      const tracking = exercise.tracking ?? (exercise.legacy?.duration && !exercise.legacy.reps ? 'duration' : 'weight-reps');
      const legacyCount = Number(exercise.legacy?.sets);
      const sets = exercise.sets.length || !exercise.legacy ? exercise.sets : Array.from({ length: Number.isInteger(legacyCount) && legacyCount > 0 ? Math.min(legacyCount, 100) : 1 }, (_, index) => ({
        setNumber: index + 1, reps: exercise.legacy?.reps ?? '', weight: exercise.legacy?.weight ?? '', rpe: '', duration: exercise.legacy?.duration ?? '', completed: false,
      }));
      return { id, name: exercise.name, tracking, sets: sets.map((set, index) => ({ id: `${id}-set-${index + 1}`, reps: set.reps, weight: set.weight, rpe: set.rpe, duration: set.duration ?? '', kind: 'kind' in set && set.kind === 'warmup' ? 'warmup' : 'work', completed: set.completed })) };
    }),
  };
}

export async function readWorkoutSessionLocal(scope: WorkoutScope, effectiveId: string | null, outboxId?: string): Promise<Local> {
      const [scopedDraft, baseDraft, queued] = await Promise.all([readWorkoutDraft(scope.userId, scope.date, effectiveId), !scope.logId && effectiveId ? readWorkoutDraft(scope.userId, scope.date, null) : Promise.resolve(null), readOutbox(scope.userId)]);
      const storedDraft = baseDraft && (!scopedDraft || baseDraft.savedAt > scopedDraft.savedAt) ? { ...baseDraft, existingLogId: effectiveId } : scopedDraft;
      const continuesRoute = (candidate: OutboxItem) => candidate.user_id === scope.userId && candidate.date === scope.date && candidate.retrySources?.some((source) => source.id === outboxId && source.existingLogId === scope.logId);
      const item = outboxId ? queued.find((candidate) => candidate.id === outboxId) ?? queued.find(continuesRoute) : queued.find((candidate) => candidate.date === scope.date && candidate.existingLogId === effectiveId);
      if (outboxId && (!item || item.user_id !== scope.userId || item.date !== scope.date || (item.existingLogId !== scope.logId && (item.existingLogId !== null || item.retryLogId !== scope.logId) && !continuesRoute(item)))) throw new Error('The selected saved workout is unavailable for this account');
      return { draft: storedDraft, queued: item ?? null, related: queued.filter((candidate) => candidate.user_id === scope.userId && candidate.date === scope.date) };
}

export function useWorkoutSession(scope: WorkoutScope, options: { initialDay?: number; outboxId?: string } = {}) {
  const queryClient = useQueryClient();
  const profileQuery = useUserProfile();
  const planQuery = useWorkoutPlan({ userRowsOnly: true });
  const identity = useMemo(() => ({ userId: scope.userId, date: scope.date, logId: scope.logId, outboxId: options.outboxId }), [scope.userId, scope.date, scope.logId, options.outboxId]);
  const activeIdentity = useRef(identity);
  activeIdentity.current = identity; // Gate async work and rendering before effects after an account switch.
  const epoch = useRef(0);
  const initialized = useRef<typeof identity | null>(null);
  const snapshot = useRef<WorkoutEditSnapshot>({ generation: 0, state: initialWorkoutState });
  const [ownedState, setOwnedState] = useState({ identity, state: initialWorkoutState });
  const [delivery, setDelivery] = useState<WorkoutSession['deliveryState']>('idle');
  const [error, setError] = useState<string | null>(null);
  const [legacyText, setLegacyText] = useState<string | undefined>();
  const [resolvedRecovery, setResolvedRecovery] = useState<string | null>(null);
  const [recoveredTarget, setRecoveredTarget] = useState<{ identity: typeof identity; logId: string; outboxId?: string } | null>(null);
  const saving = useRef(false);
  const selecting = useRef(false);
  const protection = useRef<SourceProtection>({ sourceKind: 'structured' });
  const pendingReceipt = useRef<WorkoutReceipt | null>(null);
  const receiptState = useRef<ReceiptState | null>(null);
  const draft = useWorkoutDraft(scope.userId, scope.date, scope.logId);
  const draftRef = useRef(draft); draftRef.current = draft;
  const recordsQuery = useQuery({
    queryKey: ['workoutSessionRecords', scope.userId, scope.date, scope.logId],
    queryFn: async (): Promise<Row[]> => {
      const { data, error: queryError } = await supabase.from('workout_logs').select('id, date, title, content').eq('user_id', scope.userId).eq('date', scope.date).order('created_at', { ascending: false });
      if (queryError) throw queryError;
      return (data ?? []) as Row[];
    },
    enabled: Boolean(scope.userId), retry: false,
  });
  const records = recordsQuery.isFetching && initialized.current !== identity ? undefined : recordsQuery.data;
  const recovered = recoveredTarget?.identity === identity ? recoveredTarget : null;
  const requestedOutboxId = recovered ? recovered.outboxId : options.outboxId;
  const effectiveId = recovered?.logId ?? scope.logId ?? (!options.outboxId && records?.length === 1 ? records[0].id : null);
  const localQuery = useQuery({
    queryKey: ['workoutSessionLocal', scope.userId, scope.date, effectiveId, requestedOutboxId],
    queryFn: async (): Promise<Local> => {
      return readWorkoutSessionLocal(recovered ? { ...scope, logId: recovered.logId } : scope, effectiveId, requestedOutboxId);
    },
    enabled: Boolean(scope.userId), retry: false, staleTime: 0, gcTime: 0, refetchOnMount: 'always',
  });
  const local = localQuery.isFetching && initialized.current !== identity ? undefined : localQuery.data;
  const versions = local?.related;
  const recoveryKey = versions?.map((item) => `${item.id}:${item.revision ?? 0}`).join('|');
  const selectedRetryId = versions?.find((item) => item.retryLogId)?.retryLogId;
  const recoveryTargets = records?.filter((row) => (versions?.some((item) => item.existingLogId === row.id) || row.id === selectedRetryId) && (!selectedRetryId || selectedRetryId === row.id)) ?? [];
  const recoverableVersions = Boolean(selectedRetryId || (versions?.some((item) => item.existingLogId === null) && versions.some((item) => item.existingLogId !== null)));
  const recovery = local?.queued && recoverableVersions && versions?.some((item) => item.id === local.queued?.id) && recoveryKey !== resolvedRecovery
    ? { versions, targets: recoveryTargets, canRetry: !recordsQuery.isError && !recordsQuery.isFetching && recoveryTargets.length > 0 } : null;
  const hasRecovery = recovery !== null;
  const queuedDraft: DraftData | null = local?.queued ? (() => {
    const parsed = exercisesFromContent(local.queued.content);
    return { workoutTitle: local.queued.title, exercises: parsed.exercises, selectedPlanId: String(parsed.day ?? 'custom'), existingLogId: local.queued.existingLogId ?? local.queued.retryLogId ?? null, savedAt: local.queued.queuedAt, sourceKind: parsed.text === undefined ? 'structured' : 'text', legacyText: parsed.text };
  })() : null;
  const preferredDraft = local === undefined ? undefined : local.draft && (!queuedDraft || local.draft.savedAt > queuedDraft.savedAt) ? local.draft : queuedDraft;
  const noAssignedPlan = profileQuery.isSuccess && !profileQuery.isFetching && !parsePointer(profileQuery.data?.active_workout_plan ?? null);
  const resolution = resolveWorkoutEntry({ explicitLogId: effectiveId, records, recordsFailed: recordsQuery.isError, draft: preferredDraft, draftFailed: localQuery.isError, planReady: planQuery.data !== undefined || noAssignedPlan, hasAssignedPlan: Boolean(planQuery.data?.days.length) });
  // Owned local content remains editable offline. An authoritative missing row
  // still blocks explicit identity recovery, and persistence never falls through.
  const offlineDraft = recordsQuery.isError && preferredDraft && preferredDraft.existingLogId === scope.logId;
  const exactUnscoped = !recovered && !scope.logId && options.outboxId && local?.queued?.existingLogId === null;
  const resolved: WorkoutEntry = !localQuery.isError && offlineDraft
    ? { kind: 'ready', source: 'draft' }
    : !localQuery.isError && exactUnscoped && records?.length
      ? { kind: 'choose-log', ids: records.map((row) => row.id) }
      : resolution.kind === 'loading' && (planQuery.isError || profileQuery.isError) && records?.length === 0 && local !== undefined
        ? { kind: 'error', reason: 'unavailable' } : resolution;
  const source = resolved.kind === 'ready' ? resolved.source : null;
  const matchingRow = recordsQuery.data?.find((row) => row.id === effectiveId);
  const serverText = matchingRow ? exercisesFromContent(matchingRow.content).text : undefined;
  // Even old drafts without metadata must respect the authoritative text source.
  const protectedText = serverText ?? preferredDraft?.legacyText ?? queuedDraft?.legacyText;
  const sourceKind: SourceProtection['sourceKind'] = protectedText !== undefined ? 'text'
    : matchingRow || queuedDraft || preferredDraft?.sourceKind === 'structured' || !effectiveId ? 'structured' : 'unknown';

  const publish = useCallback((next: WorkoutEditSnapshot) => {
    snapshot.current = next;
    setOwnedState({ identity, state: next.state });
  }, [identity]);

  useEffect(() => {
    const currentEpoch = ++epoch.current;
    initialized.current = null;
    snapshot.current = { generation: 0, state: initialWorkoutState };
    setOwnedState({ identity, state: initialWorkoutState });
    setDelivery('idle'); setError(null); setLegacyText(undefined); setResolvedRecovery(null); setRecoveredTarget(null); saving.current = false; selecting.current = false; pendingReceipt.current = null; receiptState.current = null; protection.current = { sourceKind: 'structured' };
    return () => { if (epoch.current === currentEpoch) epoch.current += 1; };
  }, [identity]);

  useEffect(() => {
    if (activeIdentity.current !== identity || initialized.current === identity || !source) return;
    let next = initialWorkoutState;
    if (source === 'draft' && preferredDraft) {
      next = workoutReducer(next, { type: 'RESTORE_DRAFT', payload: { title: preferredDraft.workoutTitle, exercises: preferredDraft.exercises, existingLogId: preferredDraft.existingLogId, selectedDay: Number(preferredDraft.selectedPlanId) || null } });
      if (local?.queued) { setDelivery(local.queued.failure?.retryable === false ? 'blocked' : 'queued'); pendingReceipt.current = { id: local.queued.id, revision: local.queued.revision ?? 0, existingLogId: local.queued.existingLogId }; }
    } else if (source === 'server') {
      const record = recordsQuery.data?.find((row) => row.id === effectiveId);
      if (!record) return;
      const parsed = exercisesFromContent(record.content);
      next = workoutReducer(next, { type: 'LOAD_EXISTING_LOG', payload: { logId: record.id, title: record.title ?? '', exercises: parsed.exercises, selectedDay: parsed.day } });
    } else if (source === 'plan') {
      const day = planQuery.data?.days.find((entry) => entry.day_number === options.initialDay) ?? planQuery.data?.days[0];
      if (!day) return;
      next = workoutReducer(next, { type: 'LOAD_DEFAULT_PLAN', payload: { day: day.day_number, title: day.focus ? `Day ${day.day_number} — ${day.focus}` : `Day ${day.day_number}`, exercises: day.exercises.map(createDraftExerciseFromPlan) } });
    }
    protection.current = { sourceKind, legacyText: protectedText };
    setLegacyText(protectedText);
    initialized.current = identity;
    publish({ generation: 0, state: next });
  }, [identity, source, preferredDraft, local, recordsQuery.data, effectiveId, planQuery.data, options.initialDay, publish, sourceKind, protectedText]);

  useEffect(() => {
    if (initialized.current !== identity || activeIdentity.current !== identity) return;
    // A reconnect may reveal the format of a metadata-free offline draft.
    if (sourceKind === 'text' || (protection.current.sourceKind === 'unknown' && sourceKind === 'structured')) {
      protection.current = { sourceKind, legacyText: protectedText };
      setLegacyText(protectedText);
    }
  }, [identity, sourceKind, protectedText]);

  const isCurrent = useCallback(() => activeIdentity.current === identity && initialized.current === identity, [identity]);
  const edit = useCallback((action: WorkoutEditAction) => {
    if (!isCurrent() || protection.current.sourceKind === 'text') return false;
    // Choosing another plan changes this session's contents, never its persisted row.
    const current = snapshot.current;
    const currentId = current.state.existingLogId;
    let next = applyWorkoutEdit(current, action);
    if (next === current) return false;
    if (action.type === 'LOAD_DEFAULT_PLAN' && currentId) next = attachPersistedWorkoutId(next, currentId);
    publish(next); setError(null);
    return true;
  }, [isCurrent, publish]);
  const flushDraft = useCallback(async () => {
    if (!isCurrent()) return false;
    const saved = await draftRef.current.saveDraftNow(asDraft(snapshot.current.state, protection.current));
    if (isCurrent() && !saved) setError('Couldn’t save on this device. Keep this screen open and try again.');
    return saved && isCurrent();
  }, [isCurrent]);
  const discardDraft = useCallback(async () => {
    if (!isCurrent()) return false;
    const cleared = await draftRef.current.clearDraft(snapshot.current.state.existingLogId);
    if (isCurrent() && !cleared) setError('Couldn’t discard local changes. Keep this screen open and try again.');
    return cleared && isCurrent();
  }, [isCurrent]);

  const visible = ownedState.identity === identity ? ownedState.state : initialWorkoutState;
  useEffect(() => {
    if (isCurrent() && visible.isDirty) void draftRef.current.saveDraft(asDraft(visible, protection.current));
  }, [visible, isCurrent]);
  useEffect(() => subscribeWorkoutDelivery((event) => {
    if (!isCurrent() || event.userId !== scope.userId || event.date !== scope.date) return;
    if (event.kind === 'identity') {
      // Manual recovery commits draft ownership from its whole-operation result.
      if (saving.current && hasRecovery) return;
      const currentId = snapshot.current.state.existingLogId;
      if (currentId !== event.requestedId && currentId !== event.logId) return;
      if (pendingReceipt.current?.id === event.fromId) pendingReceipt.current = { ...pendingReceipt.current, id: event.id, existingLogId: event.logId };
      publish(attachPersistedWorkoutId(snapshot.current, event.logId));
      return;
    }
    const pending = pendingReceipt.current;
    if (!pending || pending.id !== event.receipt.id || pending.revision !== event.receipt.revision || pending.existingLogId !== event.receipt.existingLogId) return;
    receiptState.current = { receipt: event.receipt, status: event.status };
    setDelivery(event.status);
    if (event.status === 'blocked') setError('Saved on this device. Review this workout and retry syncing.');
  }), [isCurrent, scope.userId, scope.date, publish, hasRecovery]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active' && isCurrent() && snapshot.current.state.isDirty) void flushDraft();
    });
    return () => subscription.remove();
  }, [flushDraft, isCurrent]);

  const requiresChoice = resolved.kind === 'choose-log' && !(initialized.current === identity && snapshot.current.state.existingLogId);
  const confirmedMissing = resolved.kind === 'error' && resolved.reason === 'missing-log';
  const save = useCallback(async (): ReturnType<WorkoutSession['save']> => {
    if (!isCurrent() || confirmedMissing || requiresChoice || hasRecovery || !acquireWorkoutSave(saving)) return 'invalid';
    const saveEpoch = epoch.current;
    const submitted = snapshot.current;
    const current = () => isCurrent() && epoch.current === saveEpoch;
    if (!submitted.state.title.trim() || protection.current.sourceKind !== 'structured') {
      setError(protection.current.sourceKind === 'text' ? 'This historical text remains available in Training history. It cannot be replaced with empty set data.' : protection.current.sourceKind === 'unknown' ? 'Reconnect to verify this historical workout before saving. Your local edits are preserved.' : 'Give this workout a title first.');
      releaseWorkoutSave(saving); return 'invalid';
    }
    setDelivery('sending'); setError(null); pendingReceipt.current = null; receiptState.current = null;
    try {
      const content = serializeWorkoutExercises(submitted.state.exercises, submitted.state.selectedDay);
      const result = await saveWorkoutLog({ user_id: scope.userId, date: scope.date, title: submitted.state.title.trim(), content, existingLogId: submitted.state.existingLogId }, (receipt) => { if (current()) { pendingReceipt.current = receipt; receiptState.current = null; } });
      if (!current()) return result.status === 'offline' ? 'queued' : result.status;
      if (result.status === 'synced') publish(attachPersistedWorkoutId(snapshot.current, result.logId));
      // Background delivery may update this ref while the save promise waits.
      const observed = receiptState.current as ReceiptState | null;
      const pending = pendingReceipt.current as WorkoutReceipt | null;
      const status = observed && pending && observed.receipt.id === pending.id && observed.receipt.revision === pending.revision
        ? observed.status : result.status === 'offline' ? 'queued' : result.status;
      setDelivery(status);
      if (status === 'blocked') { setError('Saved on this device. Review this workout and retry syncing.'); await flushDraft(); return status; }
      const finalized = await finalizeWorkoutSave({ savedGeneration: submitted.generation, getCurrentGeneration: () => current() ? snapshot.current.generation : -1, clearDraft: () => current() ? draftRef.current.clearDraft(snapshot.current.state.existingLogId) : Promise.resolve(false), repersistLatestDraft: () => current() ? flushDraft() : Promise.resolve(false) });
      if (!current()) return status;
      if (finalized === 'finalized') publish({ ...snapshot.current, state: workoutReducer(snapshot.current.state, { type: 'MARK_CLEAN' }) });
      else setError(finalized === 'edited' ? 'Earlier version saved. Newer edits are still open; save again when ready.' : 'The submitted version was saved, but local draft storage needs attention. Keep editing and retry.');
      void queryClient.invalidateQueries({ queryKey: ['workoutLogs'] });
      return status;
    } catch (cause) {
      const conflict = cause instanceof Error && 'status' in cause && cause.status === 409;
      if (current()) { setDelivery('idle'); setError(conflict ? cause.message : 'Couldn’t save on this device. Keep this screen open and try again.'); }
      return conflict ? 'invalid' : 'storage-error';
    } finally { if (current()) releaseWorkoutSave(saving); }
  }, [isCurrent, confirmedMissing, requiresChoice, hasRecovery, scope.userId, scope.date, publish, flushDraft, queryClient]);

  const recoverSavedVersions = async (logId: string): Promise<{ logId: string; outboxId?: string } | null> => {
    if (activeIdentity.current !== identity || !recovery?.canRetry || !recovery.targets.some((row) => row.id === logId) || !local?.queued || !acquireWorkoutSave(saving)) return null;
    const recoveryEpoch = epoch.current;
    const current = () => activeIdentity.current === identity && epoch.current === recoveryEpoch;
    const predecessor = recovery.versions[0];
    const viewed = local.queued;
    const retainedDraft = local.draft && local.draft.savedAt > viewed.queuedAt ? local.draft : null;
    setDelivery('sending'); setError(null); pendingReceipt.current = null; receiptState.current = null;
    const complete = async (result: WorkoutRecoveryResult) => {
      if (!current()) return null;
      setDelivery(result.status);
      if (!result.logId) {
        setError('Both versions are saved on this device. Reload and retry when synchronization is available.');
        await localQuery.refetch();
        return null;
      }
      const target = { logId: result.logId, outboxId: result.outboxId ?? undefined };
      const hasRetainedEdits = isCurrent() && (snapshot.current.generation > 0 || retainedDraft);
      await localQuery.refetch();
      if (!current()) return null;
      setResolvedRecovery(recoveryKey ?? null);
      const draftLogId = hasRetainedEdits ? snapshot.current.state.existingLogId ?? result.logId : result.logId;
      setRecoveredTarget({ identity, ...(draftLogId === result.logId ? target : { logId: draftLogId }) });
      setDelivery(result.status === 'synced' ? 'idle' : result.status);
      if (hasRetainedEdits) {
        // A receipt concerns retained queue bytes, never edits made since opening.
        publish(attachPersistedWorkoutId(snapshot.current, draftLogId));
        if (await flushDraft()) setError(result.status === 'synced' ? 'Saved versions recovered. Your newer edits are still open; save when ready.' : 'Saved versions still need synchronization. Your newer edits are open; review and save when ready.');
        return null;
      }
      initialized.current = null;
      return target;
    };
    try {
      const hasLiveEdits = isCurrent() && snapshot.current.generation > 0;
      if ((hasLiveEdits || retainedDraft) && !scope.logId && await readWorkoutDraft(scope.userId, scope.date, logId)) throw new Error('This workout also has a local draft. Open its saved version in Logs to retry; your current draft is preserved.');
      if (!current()) return null;
      if (!hasLiveEdits && retainedDraft) {
        const restored = workoutReducer(initialWorkoutState, { type: 'RESTORE_DRAFT', payload: { title: retainedDraft.workoutTitle, exercises: retainedDraft.exercises, existingLogId: retainedDraft.existingLogId, selectedDay: Number(retainedDraft.selectedPlanId) || null } });
        protection.current = { sourceKind: retainedDraft.sourceKind ?? sourceKind, legacyText: retainedDraft.legacyText ?? protectedText };
        setLegacyText(protection.current.legacyText);
        initialized.current = identity;
        publish({ generation: 1, state: { ...restored, isDirty: true } });
      }
      if (isCurrent() && snapshot.current.generation > 0 && !(await flushDraft())) return null;
      if (!current()) return null;
      const result = await retryWorkoutRecovery({ userId: scope.userId, date: scope.date, predecessor: { id: predecessor.id, revision: predecessor.revision ?? 0 }, viewed: { id: viewed.id, revision: viewed.revision ?? 0 }, targetLogId: logId });
      if (!current()) return null;
      void queryClient.invalidateQueries({ queryKey: ['workoutLogs'] });
      return await complete(result);
    } catch (cause) {
      if (!current()) return null;
      setDelivery('blocked');
      setError(cause instanceof Error ? cause.message : 'Couldn’t retry saved versions. Your local content is preserved.');
      // A canonical write can succeed before a later cleanup fails. Reopen only
      // the exact later retained payload, never infer a same-date destination.
      try {
        const retained = await readOutbox(scope.userId);
        const expected = recovery.versions.find((item) => item.existingLogId === logId);
        const canonical = retained.find((item) => item.date === scope.date && item.existingLogId === logId && item.title === expected?.title && item.content === expected?.content);
        if (current() && canonical && !retained.some((item) => item.id === predecessor.id)) return await complete({ status: canonical.failure?.retryable === false ? 'blocked' : 'queued', logId, outboxId: canonical.id, receipt: { id: canonical.id, revision: canonical.revision ?? 0, existingLogId: logId } });
      } catch { /* Keep the current route and drafts when storage cannot be read. */ }
      if (current()) await localQuery.refetch();
      return null;
    } finally { if (current()) { releaseWorkoutSave(saving); setDelivery((state) => state === 'sending' ? 'idle' : state); } }
  };

  const selectLog = async (logId: string): Promise<{ logId: string; outboxId?: string } | null> => {
    if (activeIdentity.current !== identity || recovery || !requiresChoice || resolved.kind !== 'choose-log' || !resolved.ids.includes(logId) || selecting.current) return null;
    selecting.current = true;
    setError(null);
    try {
      const queued = local?.queued;
      // A deliberate association must not erase another local record.
      const draftOnly = !queued && local?.draft?.existingLogId === null;
      if (!exactUnscoped && !draftOnly) return { logId };
      if (draftOnly) {
        const generation = snapshot.current.generation;
        const selectionEpoch = epoch.current;
        const liveDraft = isCurrent() && generation > 0 ? asDraft(snapshot.current.state, protection.current) : null;
        const retainedDraft = liveDraft ?? local.draft;
        if (!retainedDraft) return null;
        const currentSelection = () => activeIdentity.current === identity && epoch.current === selectionEpoch && snapshot.current.generation === generation;
        const associated = await draftRef.current.associateDraft(logId, { ...retainedDraft, existingLogId: logId }, currentSelection);
        if (!associated || !currentSelection()) {
          if (activeIdentity.current === identity) setError('Couldn’t associate this local draft. Its original saved version is still available; retry the selection.');
          return null;
        }
        return { logId };
      }
      if (await readWorkoutDraft(scope.userId, scope.date, logId)) throw new Error('The selected workout already has a local draft. Resolve it in Logs first.');
      if (activeIdentity.current !== identity) return null;
      if (!queued) return null;
      const newerDraft = local.draft && local.draft.savedAt > queued.queuedAt ? local.draft : null;
      const liveDraft = isCurrent() && snapshot.current.generation > 0 ? asDraft(snapshot.current.state, protection.current) : null;
      const retainedDraft = liveDraft ?? newerDraft;
      const content = retainedDraft ? retainedDraft.legacyText ?? serializeWorkoutExercises(retainedDraft.exercises, Number(retainedDraft.selectedPlanId) || null) : queued.content;
      const associated = await associateWorkoutOutbox({ userId: scope.userId, date: scope.date, outboxId: queued.id, revision: queued.revision ?? 0, logId, title: retainedDraft?.workoutTitle ?? queued.title, content });
      // The selected queue now contains the retained content before any source
      // draft cleanup. Failed cleanup cannot destroy the recovery payload.
      if (activeIdentity.current !== identity) return null;
      if (retainedDraft) await draftRef.current.clearDraft();
      if (activeIdentity.current !== identity) return null;
      return { logId, outboxId: associated.id };
    } catch (cause) {
      if (activeIdentity.current === identity) setError(cause instanceof Error ? cause.message : 'Couldn’t associate this saved workout. Your local content is preserved.');
      return null;
    } finally { if (activeIdentity.current === identity) selecting.current = false; }
  };

  const entry: WorkoutEntry = requiresChoice ? resolved : initialized.current === identity && !confirmedMissing ? { kind: 'ready', source: resolved.kind === 'ready' ? resolved.source : 'draft' } : resolved.kind === 'ready' ? { kind: 'loading' } : resolved;
  return { scope: { ...scope, logId: visible.existingLogId ?? scope.logId }, entry, state: visible, draftState: ({ idle: 'clean', saving: 'writing', saved: 'saved', error: 'error' } as const)[draft.draftStatus], deliveryState: ownedState.identity === identity ? delivery : 'idle', edit, save, flushDraft, discardDraft, selectLog, recovery, recoverSavedVersions, error: ownedState.identity === identity ? error : null, legacyText: ownedState.identity === identity ? legacyText : undefined, plan: planQuery.data, records: recordsQuery.data, retry: () => { void recordsQuery.refetch(); void localQuery.refetch(); void planQuery.refetch(); void profileQuery.refetch(); } };
}
