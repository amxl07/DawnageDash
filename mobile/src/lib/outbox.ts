import { createAsyncOutbox } from './asyncOutbox';
import type { DeliveryFailure } from './delivery-errors';
import { supabase } from './supabase';
import { persistWorkoutLog } from './workoutPersistence';

const KEY = 'workout-outbox';
const targetId = (item: { user_id: string; date: string; existingLogId: string | null }) =>
  `${item.user_id}:${item.date}${item.existingLogId ? `:log:${item.existingLogId}` : ''}`;
export type OutboxItem = {
  id: string;
  user_id: string;
  date: string;
  title: string;
  content: string;
  existingLogId: string | null;
  /** Durable selected destination for a retained recovery group; never sent on the wire. */
  retryLogId?: string;
  /** Exact original routes that may reopen this recovery after their item is acknowledged. */
  retrySources?: { id: string; existingLogId: string | null }[];
  queuedAt: number;
  revision?: number;
  failure?: DeliveryFailure;
};
export type WorkoutReceipt = { id: string; revision: number; existingLogId: string | null };
export type WorkoutDeliveryEvent =
  | { kind: 'identity'; userId: string; date: string; fromId: string; requestedId: string | null; logId: string; id: string }
  | { kind: 'state'; userId: string; date: string; receipt: WorkoutReceipt; status: 'queued' | 'blocked' | 'synced'; failure?: DeliveryFailure };
const deliveryListeners = new Set<(event: WorkoutDeliveryEvent) => void>();
export function subscribeWorkoutDelivery(listener: (event: WorkoutDeliveryEvent) => void) {
  deliveryListeners.add(listener);
  return () => { deliveryListeners.delete(listener); };
}
const receiptOf = (item: OutboxItem): WorkoutReceipt => ({ id: item.id, revision: item.revision ?? 0, existingLogId: item.existingLogId });
const publish = (event: WorkoutDeliveryEvent) => { for (const listener of deliveryListeners) listener(event); };
type WorkoutSaveInput = Omit<OutboxItem, 'id' | 'queuedAt' | 'revision' | 'failure' | 'retryLogId' | 'retrySources'>;
export type WorkoutSaveResult =
  | { status: 'synced'; logId: string }
  | { status: 'offline'; logId: null }
  | { status: 'blocked'; logId: null; failure: DeliveryFailure };

const workoutOutbox = createAsyncOutbox<WorkoutSaveInput, OutboxItem>({
  storageKey: KEY,
  diagnosticArea: 'workout',
  belongsTo: (item, userId) => item.user_id === userId,
  sameTarget: (item, input) => item.user_id === input.user_id && item.date === input.date && item.existingLogId === input.existingLogId,
  toItem: (item) => ({ ...item, id: targetId(item), queuedAt: Date.now() }),
  validateInput: (items, input) => {
    // An unknown creation target may be the predecessor of any same-day row.
    // If its identity write failed, require recovery instead of creating two
    // independently replayable targets. Distinct explicit logs remain distinct.
    if (items.some((item) => item.user_id === input.user_id && item.date === input.date && Boolean(item.existingLogId) !== Boolean(input.existingLogId))) {
      throw Object.assign(new Error('Recover the earlier saved workout for this date in Logs before saving another record.'), { status: 409 });
    }
  },
  canFlush: (items, item) => {
    const related = items.filter((candidate) => candidate.user_id === item.user_id && candidate.date === item.date);
    const mixed = related.some((candidate) => candidate.existingLogId === null) && related.some((candidate) => candidate.existingLogId !== null);
    // Old versions can leave unknown predecessors alongside explicit targets.
    // Keep the later intent on disk until the predecessor can no longer replay.
    return !mixed || related[0] === item;
  },
  attachDeliveredResult: (item, value) => {
    if (item.existingLogId || typeof value !== 'string') return item;
    const attached = { ...item, existingLogId: value, retryLogId: undefined };
    return { ...attached, id: targetId(attached) };
  },
  onIdentityCommitted: (submitted, canonical, value) => {
    if (typeof value === 'string') publish({ kind: 'identity', userId: submitted.user_id, date: submitted.date, fromId: submitted.id, requestedId: submitted.existingLogId, logId: value, id: canonical.id });
  },
  onDeliveryState: (item, result) => publish({ kind: 'state', userId: item.user_id, date: item.date, receipt: receiptOf(item), status: result.status === 'offline' ? 'queued' : result.status, ...(result.status === 'blocked' ? { failure: result.failure } : {}) }),
  refreshAuth: async () => { const { error } = await supabase.auth.refreshSession(); if (error) throw error; },
});

export function readOutbox(userId: string): Promise<OutboxItem[]> { return workoutOutbox.read(userId); }
export function enqueue(item: WorkoutSaveInput): Promise<void> { return workoutOutbox.enqueue(item); }
const deliver = (item: OutboxItem): Promise<string> => persistWorkoutLog({ user_id: item.user_id, date: item.date, title: item.title, content: item.content }, item.existingLogId ?? item.retryLogId ?? null);

/** Durably supersedes the same owned log's intent before attempting delivery. */
export function saveWorkoutLog(item: WorkoutSaveInput, onQueued?: (receipt: WorkoutReceipt) => void): Promise<WorkoutSaveResult> {
  return workoutOutbox.save(item, deliver, (queued) => onQueued?.(receiptOf(queued))).then((result): WorkoutSaveResult => {
    if (result.status === 'synced') return { status: 'synced', logId: result.value };
    if (result.status === 'blocked') return { status: 'blocked', logId: null, failure: result.failure };
    return { status: 'offline', logId: null };
  });
}

/** Deliberately bind preserved content to a selected owned row; never replace a second local record. */
export function associateWorkoutOutbox(input: { userId: string; date: string; outboxId: string; revision: number; logId: string; title: string; content: string }): Promise<OutboxItem> {
  return workoutOutbox.retarget(input.userId, input.outboxId, input.revision, (item) => {
    if (item.date !== input.date || item.existingLogId !== null) throw new Error('This saved workout cannot be reassociated');
    const attached: OutboxItem = { ...item, title: input.title, content: input.content, existingLogId: input.logId, queuedAt: Date.now(), failure: { kind: 'conflict', retryable: false, code: 'review-required' } };
    return { ...attached, id: targetId(attached) };
  });
}

/** A null logId leaves navigation/draft ownership unchanged; receipt identifies the actual last delivery. */
export type WorkoutRecoveryResult = { status: 'synced' | 'queued' | 'blocked'; logId: string | null; outboxId: string | null; receipt: WorkoutReceipt };

/** Explicitly retry the retained predecessor; ordinary new-intent guards stay intact. */
export async function retryWorkoutRecovery(input: { userId: string; date: string; predecessor: Pick<WorkoutReceipt, 'id' | 'revision'>; viewed: Pick<WorkoutReceipt, 'id' | 'revision'>; targetLogId: string }): Promise<WorkoutRecoveryResult> {
  const retained = (await workoutOutbox.read(input.userId)).filter((item) => item.date === input.date);
  const predecessor = retained.find((item) => item.id === input.predecessor.id && (item.revision ?? 0) === input.predecessor.revision);
  const viewed = retained.find((item) => item.id === input.viewed.id && (item.revision ?? 0) === input.viewed.revision);
  if (!predecessor || retained[0] !== predecessor || !viewed || !input.targetLogId) throw Object.assign(new Error('These saved versions changed. Reload before retrying.'), { status: 409 });

  const changed = () => Object.assign(new Error('These saved versions changed. Reload before retrying.'), { status: 409 });
  const unscoped = retained.find((item) => item.existingLogId === null);
  const selected = unscoped?.retryLogId ?? retained.find((item) => item.retryLogId)?.retryLogId;
  if ((!unscoped && !selected) || (selected ? selected !== input.targetLogId : !retained.some((item) => item.existingLogId === input.targetLogId)) || retained.some((item) => item.retryLogId && item.retryLogId !== input.targetLogId)) throw changed();

  // Keep the chosen destination and every original entry route on survivors.
  // Null may be in the middle, and its acknowledgment must not erase the
  // recovery choice or strand a route whose earlier payload is already gone.
  const sources = retained.find((item) => item.retrySources)?.retrySources ?? retained.map(({ id, existingLogId }) => ({ id, existingLogId }));
  const expected = new Map(retained.map((item) => [item.id, item.revision ?? 0]));
  const validate = (items: readonly OutboxItem[]) => {
    const related = items.filter((item) => item.user_id === input.userId && item.date === input.date);
    if (related.length !== expected.size || related.some((item) => expected.get(item.id) !== (item.revision ?? 0))) throw changed();
    return related;
  };
  // Annotate null first so a failed later annotation still preserves the choice.
  for (const item of [...(unscoped ? [unscoped] : []), ...retained.filter((item) => item !== unscoped)]) {
    if (item.retryLogId === input.targetLogId && item.retrySources) continue;
    const annotated = await workoutOutbox.annotate(input.userId, item.id, item.revision ?? 0, (source, items) => {
      validate(items);
      return { ...source, retryLogId: input.targetLogId, retrySources: sources };
    });
    expected.set(item.id, annotated.revision ?? 0);
  }

  let lastReceipt = receiptOf(predecessor);
  for (;;) {
    const remaining = (await workoutOutbox.read(input.userId)).filter((item) => item.date === input.date);
    // Successful canonicalization can consume both null and its later explicit
    // destination in one awaited retry chain. Never replay those payloads.
    for (const id of expected.keys()) if (!remaining.some((item) => item.id === id)) expected.delete(id);
    if (!remaining.length) return { status: 'synced', logId: input.targetLogId, outboxId: null, receipt: lastReceipt };
    validate(remaining);
    const next = remaining[0];
    const step = await workoutOutbox.retry(input.userId, next.id, next.revision ?? 0, (source, items) => {
      if (validate(items)[0] !== source || source.retryLogId !== input.targetLogId) throw changed();
      return source;
    }, deliver);
    lastReceipt = receiptOf(step.item);
    if (step.result.status !== 'synced') {
      const status = step.result.status === 'offline' ? 'queued' : step.result.status;
      // A predecessor/trailing receipt cannot reassign the current draft or
      // pair the selected destination with another explicit record's route.
      const reachedSelection = next.existingLogId === null || !remaining.some((item) => item.existingLogId === null);
      const actionable = reachedSelection && (step.item.existingLogId === input.targetLogId || (step.item.existingLogId === null && remaining.length === 1));
      return { status, logId: actionable ? input.targetLogId : null, outboxId: step.item.id, receipt: lastReceipt };
    }
  }
}

/** Confirmed deliveries, with at-least-once replay after interrupted cleanup. */
export async function flushOutbox(userId: string): Promise<number> {
  let confirmed = 0;
  for (;;) {
    const count = await workoutOutbox.flush(userId, deliver);
    confirmed += count;
    // A confirmed predecessor may release another retained target. Stop when
    // no progress is possible; active, offline, or blocked work stays durable.
    if (count === 0) return confirmed;
  }
}
