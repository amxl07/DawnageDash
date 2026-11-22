import AsyncStorage from '@react-native-async-storage/async-storage';

import { recordDiagnostic, type DiagnosticArea } from './diagnostics';
import { classifyDeliveryFailure, type DeliveryFailure } from './delivery-errors';

export type DurableOutboxItem = {
  id: string;
  queuedAt: number;
  revision?: number;
  failure?: DeliveryFailure;
};

export type OutboxSaveResult<T> =
  | { status: 'synced'; value: T }
  | { status: 'offline'; value: null }
  | { status: 'blocked'; value: null; failure: DeliveryFailure };

type OutboxConfig<TInput, TItem extends DurableOutboxItem> = {
  storageKey: string;
  diagnosticArea?: DiagnosticArea;
  belongsTo: (item: TItem, userId: string) => boolean;
  sameTarget: (item: TItem, input: TInput) => boolean;
  toItem: (input: TInput) => TItem;
  refreshAuth?: () => Promise<void>;
  /** Canonicalize a confirmed remote identity without changing payload content. */
  attachDeliveredResult?: (item: TItem, value: unknown) => TItem;
  validateInput?: (items: readonly TItem[], input: TInput) => void;
  /** Keep later potentially aliased intents durable until their predecessor resolves. */
  canFlush?: (items: readonly TItem[], item: TItem) => boolean;
  onIdentityCommitted?: (submitted: TItem, canonical: TItem, value: unknown) => void;
  onDeliveryState?: (item: TItem, result: OutboxSaveResult<unknown>) => void;
};

type AttemptResult<T> = OutboxSaveResult<T>;
type Attempt<T> = {
  result: AttemptResult<T>;
  failure?: DeliveryFailure;
};
type Persist<TItem, TValue> = (item: TItem) => Promise<TValue>;

/**
 * Durable, account-scoped AsyncStorage queue with serialized storage mutations.
 * Network delivery is coordinated per logical target and runs outside that lock.
 */
export function createAsyncOutbox<TInput, TItem extends DurableOutboxItem>(
  config: OutboxConfig<TInput, TItem>,
) {
  type ActiveDelivery = {
    item: TItem;
    persist: Persist<TItem, unknown>;
  };

  let mutationQueue: Promise<void> = Promise.resolve();
  const activeDeliveries: ActiveDelivery[] = [];
  const revisionStorageKey = `${config.storageKey}:revisions`;

  async function storageOperation<T>(operation: () => Promise<T>): Promise<T> {
    try { return await operation(); }
    catch (error) {
      if (config.diagnosticArea) recordDiagnostic({ event: 'delivery_storage', area: config.diagnosticArea, outcome: 'error', reason: 'local-storage' });
      throw error;
    }
  }

  function revisionOf(item: DurableOutboxItem): number {
    return Number.isSafeInteger(item.revision) && (item.revision ?? 0) >= 0
      ? item.revision ?? 0
      : 0;
  }

  function normalize(item: TItem): TItem {
    return { ...item, revision: revisionOf(item) };
  }

  async function readStrict(): Promise<TItem[]> {
    return storageOperation(async () => {
      const raw = await AsyncStorage.getItem(config.storageKey);
      if (raw === null) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('Outbox storage must contain an array');
      if (parsed.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) {
        throw new Error('Outbox storage contains an invalid item');
      }
      return (parsed as TItem[]).map(normalize);
    });
  }


  async function write(items: TItem[]): Promise<void> {
    await storageOperation(() => AsyncStorage.setItem(config.storageKey, JSON.stringify(items)));
  }

  async function readRevisionMarks(): Promise<Record<string, number>> {
    return storageOperation(async () => {
      const raw = await AsyncStorage.getItem(revisionStorageKey);
      if (raw === null) return {};
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Outbox revision storage must contain an object');
      }
      const marks = parsed as Record<string, unknown>;
      if (Object.values(marks).some((value) => !Number.isSafeInteger(value) || (value as number) < 0)) {
        throw new Error('Outbox revision storage contains an invalid revision');
      }
      return marks as Record<string, number>;
    });
  }


  async function nextRevision(items: TItem[], item: TItem): Promise<number> {
    const current = items.find((candidate) => sameItemTarget(candidate, item));
    const marks = await readRevisionMarks();
    return Math.max(revisionOf(current ?? item), marks[item.id] ?? 0) + 1;
  }

  async function recordDeliveredRevision(item: TItem): Promise<void> {
    const marks = await readRevisionMarks();
    const revision = Math.max(marks[item.id] ?? 0, revisionOf(item));
    await storageOperation(() => AsyncStorage.setItem(
      revisionStorageKey,
      JSON.stringify({ ...marks, [item.id]: revision }),
    ));
  }

  function serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = mutationQueue.then(operation, operation);
    mutationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  function sameItemTarget(left: TItem, right: TItem): boolean {
    return config.sameTarget(left, right as unknown as TInput);
  }

  function findActive(item: TItem): ActiveDelivery | undefined {
    return activeDeliveries.find((active) => sameItemTarget(active.item, item));
  }

  function removeActive(active: ActiveDelivery): void {
    const index = activeDeliveries.indexOf(active);
    if (index >= 0) activeDeliveries.splice(index, 1);
  }

  function failedAttempt(error: unknown): Attempt<never> {
    const failure = classifyDeliveryFailure(error);
    return failure.retryable
      ? { result: { status: 'offline', value: null }, failure }
      : { result: { status: 'blocked', value: null, failure }, failure };
  }

  async function attemptDelivery<T>(item: TItem, persist: Persist<TItem, T>): Promise<Attempt<T>> {
    try {
      return { result: { status: 'synced', value: await persist(item) } };
    } catch (error) {
      const firstFailure = classifyDeliveryFailure(error);
      if (firstFailure.kind === 'auth' && config.refreshAuth) {
        try {
          await config.refreshAuth();
        } catch {
          return { result: { status: 'blocked', value: null, failure: firstFailure }, failure: firstFailure };
        }
        try {
          return { result: { status: 'synced', value: await persist(item) } };
        } catch (retryError) {
          return failedAttempt(retryError);
        }
      }
      return failedAttempt(error);
    }
  }

  async function attempt<T>(item: TItem, persist: Persist<TItem, T>): Promise<Attempt<T>> {
    const startedAt = Date.now();
    const delivery = await attemptDelivery(item, persist);
    if (config.diagnosticArea) recordDiagnostic({
      event: 'delivery_attempt', area: config.diagnosticArea,
      outcome: delivery.result.status === 'synced' ? 'acknowledged' : delivery.result.status === 'offline' ? 'queued' : 'blocked',
      reason: delivery.failure?.kind,
      durationMs: Date.now() - startedAt,
      ageMs: Math.max(0, startedAt - item.queuedAt),
    });
    return delivery;
  }

  async function transitionAfterAttempt<T>(
    active: ActiveDelivery,
    submitted: TItem,
    delivery: Attempt<T>,
  ): Promise<TItem | null> {
    return serialize(async () => {
      let items = await readStrict();
      let delivered = submitted;
      if (delivery.result.status === 'synced' && config.attachDeliveredResult) {
        delivered = config.attachDeliveredResult(submitted, delivery.result.value);
        if (!sameItemTarget(delivered, submitted)) {
          const matches = items.filter((item) => sameItemTarget(item, submitted) || sameItemTarget(item, delivered));
          // Every enqueue appends. The last matching item is the later intent,
          // even when two formerly distinct targets have equal revision numbers.
          const latest = matches.at(-1);
          if (latest) {
            let canonical = config.attachDeliveredResult(latest, delivery.result.value);
            if (matches.length > 1) {
              const marks = await readRevisionMarks();
              canonical = { ...canonical, revision: Math.max(marks[canonical.id] ?? 0, ...matches.map(revisionOf)) + 1 };
            }
            // Canonicalization is not a new intent. Keep the latest matching
            // item's position even if the following cleanup is interrupted.
            const next = items.flatMap((item) => item === latest ? [canonical] : matches.includes(item) ? [] : [item]);
            // Publish identity only after the SAME revision (or its newer
            // replacement) has a durable canonical target. Cleanup may fail.
            await write(next);
            items = next;
            active.item = canonical;
          } else active.item = delivered;
          config.onIdentityCommitted?.(submitted, delivered, delivery.result.value);
        }
      }

      const current = items.find((item) => sameItemTarget(item, delivered));
      let nextItems = items;
      if (current && revisionOf(current) === revisionOf(delivered)) {
        if (delivery.result.status === 'synced') {
          await recordDeliveredRevision(current);
          nextItems = items.filter((item) => item !== current);
        } else {
          const failure = delivery.failure;
          if (!failure) throw new Error('Failed delivery did not include failure metadata');
          nextItems = items.map((item) => item === current ? { ...current, failure } : item);
        }
        await write(nextItems);
      }
      config.onDeliveryState?.(delivered, delivery.result);
      const newer = nextItems.find((item) => sameItemTarget(item, delivered));
      if (newer && revisionOf(newer) !== revisionOf(delivered)) {
        const otherActive = activeDeliveries.some((candidate) => candidate !== active && sameItemTarget(candidate.item, newer));
        if (!otherActive) { active.item = newer; return newer; }
      }
      removeActive(active);
      return null;
    });
  }

  async function abandonActive(active: ActiveDelivery): Promise<void> {
    await serialize(async () => {
      removeActive(active);
    });
  }

  async function continueDelivery(active: ActiveDelivery, first: TItem): Promise<void> {
    let current: TItem | null = first;
    try {
      while (current) {
        const delivery: Attempt<unknown> = await attempt(current, active.persist);
        current = await transitionAfterAttempt(active, current, delivery);
      }
    } catch {
      await abandonActive(active);
    }
  }

  async function deliverFirst<T>(
    active: ActiveDelivery,
    item: TItem,
    persist: Persist<TItem, T>,
  ): Promise<AttemptResult<T>> {
    const delivery = await attempt(item, persist);
    try {
      const newer = await transitionAfterAttempt(active, item, delivery);
      if (newer) void continueDelivery(active, newer);
      return delivery.result;
    } catch (error) {
      await abandonActive(active);
      throw error;
    }
  }

  function read(userId: string): Promise<TItem[]> {
    return serialize(async () => {
      const items = await readStrict();
      return items.filter((item) => config.belongsTo(item, userId));
    });
  }

  function enqueue(input: TInput): Promise<void> {
    return serialize(async () => {
      const items = await readStrict();
      config.validateInput?.(items, input);
      const item = config.toItem(input);
      const revision = await nextRevision(items, item);
      const replacement = { ...item, revision, failure: undefined };
      const filtered = items.filter((item) => !config.sameTarget(item, input));
      filtered.push(replacement);
      await write(filtered);
    });
  }

  async function save<T>(
    input: TInput,
    persist: Persist<TItem, T>,
    onQueued?: (item: TItem) => void,
  ): Promise<OutboxSaveResult<T>> {
    const acquired = await serialize(async () => {
      const items = await readStrict();
      config.validateInput?.(items, input);
      const item = config.toItem(input);
      const revision = await nextRevision(items, item);
      const replacement = { ...item, revision, failure: undefined };
      const filtered = items.filter((item) => !config.sameTarget(item, input));
      filtered.push(replacement);
      await write(filtered);

      onQueued?.(replacement);
      if (findActive(replacement)) return null;
      const active: ActiveDelivery = { item: replacement, persist };
      activeDeliveries.push(active);
      return active;
    });

    if (!acquired) return { status: 'offline', value: null };
    return deliverFirst(acquired, acquired.item, persist);
  }

  /** Deliberate local reassociation. The source survives every failed write. */
  function retarget(userId: string, sourceId: string, expectedRevision: number, transform: (item: TItem) => TItem): Promise<TItem> {
    return serialize(async () => {
      const items = await readStrict();
      const source = items.find((item) => item.id === sourceId && config.belongsTo(item, userId));
      if (!source || revisionOf(source) !== expectedRevision) throw Object.assign(new Error('This saved record changed. Reopen it before choosing a target.'), { status: 409 });
      const target = transform(source);
      if (!config.belongsTo(target, userId)) throw new Error('Record ownership cannot change');
      if (items.some((item) => item !== source && sameItemTarget(item, target))) throw Object.assign(new Error('The selected workout already has local changes. Resolve those in Logs first.'), { status: 409 });
      if (findActive(source) || findActive(target)) throw Object.assign(new Error('Wait for synchronization before choosing a workout.'), { status: 409 });
      const revision = Math.max(revisionOf(source) + 1, await nextRevision(items, target));
      const replacement = { ...target, revision };
      await recordDeliveredRevision(source);
      await write([...items.filter((item) => item !== source), replacement]);
      return replacement;
    });
  }

  /** Annotate an exact retained intent without moving it or changing its identity. */
  function annotate(userId: string, sourceId: string, expectedRevision: number, prepare: (source: TItem, items: readonly TItem[]) => TItem): Promise<TItem> {
    return serialize(async () => {
      const items = await readStrict();
      const source = items.find((item) => item.id === sourceId && config.belongsTo(item, userId));
      if (!source || revisionOf(source) !== expectedRevision) throw Object.assign(new Error('These saved versions changed. Reload before retrying.'), { status: 409 });
      const prepared = prepare(source, items);
      if (prepared.id !== source.id || !config.belongsTo(prepared, userId) || !sameItemTarget(prepared, source)) throw new Error('Annotation cannot change the retained identity');
      if (findActive(source)) throw Object.assign(new Error('These versions are already synchronizing. Wait before retrying.'), { status: 409 });
      const replacement = { ...prepared, queuedAt: source.queuedAt, revision: await nextRevision(items, source) };
      await write(items.map((item) => item === source ? replacement : item));
      return replacement;
    });
  }

  /** Retry exact retained bytes in place and await their entire delivery chain. */
  async function retry<T>(userId: string, sourceId: string, expectedRevision: number, prepare: (source: TItem, items: readonly TItem[]) => TItem, persist: Persist<TItem, T>): Promise<{ item: TItem; result: OutboxSaveResult<T> }> {
    const active = await serialize(async () => {
      const items = await readStrict();
      const source = items.find((item) => item.id === sourceId && config.belongsTo(item, userId));
      if (!source || revisionOf(source) !== expectedRevision || config.canFlush?.(items, source) === false) throw Object.assign(new Error('These saved versions changed. Reload before retrying.'), { status: 409 });
      const prepared = prepare(source, items);
      if (prepared.id !== source.id || !config.belongsTo(prepared, userId) || !sameItemTarget(prepared, source)) throw new Error('Retry cannot change the retained identity');
      if (findActive(source)) throw Object.assign(new Error('These versions are already synchronizing. Wait before retrying.'), { status: 409 });
      const replacement = { ...prepared, queuedAt: source.queuedAt, revision: await nextRevision(items, source), failure: undefined };
      // Preserve serialization order: retry is not a new user content intent.
      await write(items.map((item) => item === source ? replacement : item));
      const acquired: ActiveDelivery = { item: replacement, persist };
      activeDeliveries.push(acquired);
      return acquired;
    });
    let current = active.item;
    try {
      for (;;) {
        const delivery = await attempt(current, persist);
        const newer = await transitionAfterAttempt(active, current, delivery);
        if (!newer) return { item: delivery.result.status === 'synced' ? config.attachDeliveredResult?.(current, delivery.result.value) ?? current : current, result: delivery.result };
        current = newer;
      }
    } catch (error) {
      await abandonActive(active);
      throw error;
    }
  }

  async function flush(
    userId: string,
    persist: Persist<TItem, unknown>,
  ): Promise<number> {
    const candidates = await serialize(async () => {
      const items = await readStrict();
      return items.filter(
        (item) => config.belongsTo(item, userId) && (!item.failure || item.failure.retryable) && (config.canFlush?.(items, item) ?? true),
      );
    });

    const deliveries = candidates.map(async (candidate) => {
      const active = await serialize(async () => {
        const items = await readStrict();
        const current = items.find((item) => sameItemTarget(item, candidate));
        if (!current || revisionOf(current) !== revisionOf(candidate) || findActive(current) || config.canFlush?.(items, current) === false) {
          return null;
        }
        const next: ActiveDelivery = { item: current, persist };
        activeDeliveries.push(next);
        return next;
      });
      if (!active) return 0;
      const result = await deliverFirst(active, active.item, persist);
      return result.status === 'synced' ? 1 : 0;
    });

    const results = await Promise.all(deliveries);
    return results.reduce<number>((total, count) => total + count, 0);
  }

  return { enqueue, flush, read, save, retarget, annotate, retry };
}
