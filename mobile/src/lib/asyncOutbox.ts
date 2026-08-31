import AsyncStorage from '@react-native-async-storage/async-storage';

export type DurableOutboxItem = {
  id: string;
  queuedAt: number;
};

export type OutboxSaveResult<T> =
  | { status: 'synced'; value: T }
  | { status: 'offline'; value: null };

type OutboxConfig<TInput, TItem extends DurableOutboxItem> = {
  storageKey: string;
  belongsTo: (item: TItem, userId: string) => boolean;
  sameTarget: (item: TItem, input: TInput) => boolean;
  toItem: (input: TInput) => TItem;
};

/**
 * Durable, account-scoped AsyncStorage queue with serialized mutations.
 * A later write for the same logical target always supersedes an older one.
 */
export function createAsyncOutbox<TInput, TItem extends DurableOutboxItem>(
  config: OutboxConfig<TInput, TItem>,
) {
  let mutationQueue: Promise<void> = Promise.resolve();

  async function readStrict(): Promise<TItem[]> {
    const raw = await AsyncStorage.getItem(config.storageKey);
    return raw ? (JSON.parse(raw) as TItem[]) : [];
  }

  async function write(items: TItem[]): Promise<void> {
    await AsyncStorage.setItem(config.storageKey, JSON.stringify(items));
  }

  function serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = mutationQueue.then(operation, operation);
    mutationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async function read(userId: string): Promise<TItem[]> {
    try {
      const items = await readStrict();
      return items.filter((item) => config.belongsTo(item, userId));
    } catch {
      return [];
    }
  }

  function enqueue(input: TInput): Promise<void> {
    return serialize(async () => {
      const items = await readStrict();
      const filtered = items.filter((item) => !config.sameTarget(item, input));
      filtered.push(config.toItem(input));
      await write(filtered);
    });
  }

  function save<T>(
    input: TInput,
    persist: (input: TInput) => Promise<T>,
  ): Promise<OutboxSaveResult<T>> {
    return serialize(async () => {
      const items = await readStrict();
      const filtered = items.filter((item) => !config.sameTarget(item, input));

      // Durably remove stale work before sending its replacement.
      await write(filtered);

      try {
        return { status: 'synced', value: await persist(input) };
      } catch {
        filtered.push(config.toItem(input));
        await write(filtered);
        return { status: 'offline', value: null };
      }
    });
  }

  function flush(
    userId: string,
    persist: (item: TItem) => Promise<unknown>,
  ): Promise<number> {
    return serialize(async () => {
      const items = await readStrict();
      if (!items.some((item) => config.belongsTo(item, userId))) return 0;

      const remaining: TItem[] = [];
      let synced = 0;
      for (const item of items) {
        if (!config.belongsTo(item, userId)) {
          remaining.push(item);
          continue;
        }
        try {
          await persist(item);
          synced += 1;
        } catch {
          remaining.push(item);
        }
      }

      await write(remaining);
      return synced;
    });
  }

  return { enqueue, flush, read, save };
}
