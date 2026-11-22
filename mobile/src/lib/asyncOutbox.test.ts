import AsyncStorage from '@react-native-async-storage/async-storage';
import { PostgrestClient } from '@supabase/postgrest-js';

import { createAsyncOutbox } from './asyncOutbox';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

type Input = { userId: string; date: string; value: number };
type Item = Input & { id: string; queuedAt: number; revision?: number };

const mockStorage = jest.mocked(AsyncStorage);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('createAsyncOutbox', () => {
  let stored: string | null;
  let revisions: string | null;
  let outbox: ReturnType<typeof createAsyncOutbox<Input, Item>>;

  beforeEach(() => {
    jest.clearAllMocks();
    stored = null;
    revisions = null;
    mockStorage.getItem.mockImplementation(async (key) =>
      key === 'test-outbox' ? stored : revisions,
    );
    mockStorage.setItem.mockImplementation(async (key, value) => {
      if (key === 'test-outbox') stored = value;
      else revisions = value;
    });
    outbox = createAsyncOutbox<Input, Item>({
      storageKey: 'test-outbox',
      belongsTo: (item, userId) => item.userId === userId,
      sameTarget: (item, input) => item.userId === input.userId && item.date === input.date,
      toItem: (input) => ({
        ...input,
        id: `${input.userId}:${input.date}`,
        queuedAt: 123,
      }),
    });
  });

  it('annotates an exact retained revision in place without changing unrelated records', async () => {
    await outbox.enqueue({ userId: 'user-1', date: 'first', value: 1 });
    await outbox.enqueue({ userId: 'user-1', date: 'middle', value: 2 });
    await outbox.enqueue({ userId: 'other', date: 'other', value: 3 });
    await outbox.enqueue({ userId: 'user-1', date: 'last', value: 4 });
    const before = JSON.parse(stored!) as Item[];
    const source = before[1];
    const updated = await outbox.annotate('user-1', source.id, source.revision!, (item) => ({ ...item, retryTarget: 'chosen' }));
    const after = JSON.parse(stored!) as Item[];
    expect(after.map((item) => item.id)).toEqual(before.map((item) => item.id));
    expect(after.filter((item) => item.id !== source.id)).toEqual(before.filter((item) => item.id !== source.id));
    expect(updated).toMatchObject({ ...source, revision: source.revision! + 1, retryTarget: 'chosen' });
    await expect(outbox.annotate('user-1', source.id, source.revision!, (item) => item)).rejects.toMatchObject({ status: 409 });
    await expect(outbox.annotate('other', source.id, updated.revision!, (item) => item)).rejects.toMatchObject({ status: 409 });
    await expect(outbox.annotate('user-1', source.id, updated.revision!, (item) => ({ ...item, date: 'changed' }))).rejects.toThrow();
  });

  it('replaces the same target and keeps another account isolated', async () => {
    await outbox.enqueue({ userId: 'user-1', date: '2026-08-30', value: 1 });
    await outbox.enqueue({ userId: 'user-1', date: '2026-08-30', value: 2 });
    await outbox.enqueue({ userId: 'user-2', date: '2026-08-30', value: 3 });

    await expect(outbox.read('user-1')).resolves.toEqual([
      expect.objectContaining({ value: 2 }),
    ]);
    await expect(outbox.read('user-2')).resolves.toEqual([
      expect.objectContaining({ value: 3 }),
    ]);
  });

  it('durably records the replacement before the first network call resolves', async () => {
    const response = deferred<string>();
    const started = deferred<void>();
    const input = { userId: 'user-1', date: '2026-08-30', value: 4 };
    const persist = jest.fn(async () => {
      started.resolve();
      const raw = await AsyncStorage.getItem('test-outbox');
      expect(JSON.parse(raw ?? '[]')).toEqual([
        expect.objectContaining({ ...input, revision: 1 }),
      ]);
      return response.promise;
    });

    const saving = outbox.save(input, persist);
    await started.promise;
    await expect(outbox.read('user-1')).resolves.toEqual([
      expect.objectContaining({ ...input, revision: 1 }),
    ]);

    response.resolve('server-id');
    await expect(saving).resolves.toEqual({ status: 'synced', value: 'server-id' });
  });

  it('queues a verified transport failure and flushes it later', async () => {
    const persist = jest
      .fn<Promise<string>, [Input | Item]>()
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce('saved');

    await expect(
      outbox.save({ userId: 'user-1', date: '2026-08-30', value: 4 }, persist),
    ).resolves.toEqual({ status: 'offline', value: null });
    await expect(outbox.read('user-1')).resolves.toEqual([
      expect.objectContaining({
        value: 4,
        revision: 1,
        failure: { kind: 'transport', retryable: true, code: 'network-request-failed' },
      }),
    ]);

    await expect(outbox.flush('user-1', persist)).resolves.toBe(1);
    await expect(outbox.read('user-1')).resolves.toEqual([]);
  });

  it('retains an SDK-wrapped offline intent and delivers it after reconnect', async () => {
    let connected = false;
    let fetchCalls = 0;
    const client = new PostgrestClient('https://delivery.test', {
      fetch: async () => {
        fetchCalls += 1;
        if (!connected) throw new TypeError('Network request failed');
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    });
    const persist = async () => {
      const response = await client.from('records').select('id').retry(false);
      if (response.error) throw response;
      return 'saved-after-reconnect';
    };

    await expect(
      outbox.save({ userId: 'user-1', date: '2026-08-30', value: 4 }, persist),
    ).resolves.toEqual({ status: 'offline', value: null });
    await expect(outbox.read('user-1')).resolves.toEqual([
      expect.objectContaining({
        value: 4,
        failure: { kind: 'transport', retryable: true, code: 'network-request-failed' },
      }),
    ]);

    connected = true;
    await expect(outbox.flush('user-1', persist)).resolves.toBe(1);
    await expect(outbox.read('user-1')).resolves.toEqual([]);
    expect(fetchCalls).toBe(2);
  });

  it('blocks and retains an unknown SDK status-zero failure', async () => {
    const client = new PostgrestClient('https://delivery.test', {
      fetch: async () => { throw new Error('adapter invariant violated'); },
    });
    const persist = async () => {
      const response = await client.from('records').select('id').retry(false);
      if (response.error) throw response;
      return 'unexpected';
    };

    await expect(
      outbox.save({ userId: 'user-1', date: '2026-08-30', value: 4 }, persist),
    ).resolves.toEqual({
      status: 'blocked',
      value: null,
      failure: { kind: 'unknown', retryable: false, code: 'http-0' },
    });
    await expect(outbox.read('user-1')).resolves.toEqual([
      expect.objectContaining({
        value: 4,
        failure: { kind: 'unknown', retryable: false, code: 'http-0' },
      }),
    ]);
  });

  it('does not overwrite durable data when the strict read fails', async () => {
    mockStorage.getItem.mockRejectedValueOnce(new Error('read failed'));

    await expect(
      outbox.enqueue({ userId: 'user-1', date: '2026-08-30', value: 1 }),
    ).rejects.toThrow('read failed');
    expect(mockStorage.setItem).not.toHaveBeenCalled();
  });

  it('surfaces read and parse failures without erasing the original raw queue', async () => {
    stored = '{not-json';

    await expect(outbox.read('user-1')).rejects.toBeInstanceOf(SyntaxError);
    expect(stored).toBe('{not-json');
    expect(mockStorage.setItem).not.toHaveBeenCalled();
  });

  it('treats an empty persisted value as corruption rather than an empty queue', async () => {
    stored = '';

    await expect(outbox.read('user-1')).rejects.toBeInstanceOf(SyntaxError);
    expect(stored).toBe('');
    expect(mockStorage.setItem).not.toHaveBeenCalled();
  });

  it('reads a process-restarted old-format item as revision zero', async () => {
    stored = JSON.stringify([{
      userId: 'user-1', date: '2026-08-30', value: 2, id: 'old', queuedAt: 100,
    }]);

    await expect(outbox.read('user-1')).resolves.toEqual([
      expect.objectContaining({ value: 2, revision: 0 }),
    ]);
  });

  it('replaces a process-restarted old-format item with revision one', async () => {
    stored = JSON.stringify([{
      userId: 'user-1', date: '2026-08-30', value: 2, id: 'old', queuedAt: 100,
    }]);
    const persist = jest.fn(async (item: Item) => {
      expect(item.revision).toBe(1);
      return 'saved';
    });

    await expect(
      outbox.save({ userId: 'user-1', date: '2026-08-30', value: 3 }, persist),
    ).resolves.toEqual({ status: 'synced', value: 'saved' });
    await expect(outbox.read('user-1')).resolves.toEqual([]);
  });

  it('does not hold the storage mutation lock while a request is slow', async () => {
    const response = deferred<string>();
    const started = deferred<void>();
    const saving = outbox.save(
      { userId: 'user-1', date: '2026-08-30', value: 1 },
      async () => {
        started.resolve();
        return response.promise;
      },
    );
    await started.promise;

    await outbox.enqueue({ userId: 'user-1', date: '2026-08-31', value: 2 });
    await expect(outbox.read('user-1')).resolves.toEqual([
      expect.objectContaining({ date: '2026-08-30', value: 1 }),
      expect.objectContaining({ date: '2026-08-31', value: 2 }),
    ]);

    response.resolve('saved');
    await saving;
  });

  it('delivers a newer revision after an older in-flight revision succeeds', async () => {
    const firstResponse = deferred<string>();
    const firstStarted = deferred<void>();
    const secondDelivered = deferred<void>();
    const values: number[] = [];
    const persist = jest.fn(async (item: Input | Item) => {
      values.push(item.value);
      if (item.value === 1) {
        firstStarted.resolve();
        return firstResponse.promise;
      }
      secondDelivered.resolve();
      return 'second-id';
    });

    const first = outbox.save({ userId: 'user-1', date: '2026-08-30', value: 1 }, persist);
    await firstStarted.promise;
    await expect(
      outbox.save({ userId: 'user-1', date: '2026-08-30', value: 2 }, persist),
    ).resolves.toEqual({ status: 'offline', value: null });
    await expect(outbox.read('user-1')).resolves.toEqual([
      expect.objectContaining({ value: 2, revision: 2 }),
    ]);

    firstResponse.resolve('first-id');
    await expect(first).resolves.toEqual({ status: 'synced', value: 'first-id' });
    await secondDelivered.promise;
    await expect(outbox.read('user-1')).resolves.toEqual([]);
    expect(values).toEqual([1, 2]);
  });

  it('allows another account target to deliver while the first account is in flight', async () => {
    const firstResponse = deferred<string>();
    const firstStarted = deferred<void>();
    const secondStarted = deferred<void>();
    const persist = async (item: Input | Item) => {
      if (item.userId === 'user-1') {
        firstStarted.resolve();
        return firstResponse.promise;
      }
      secondStarted.resolve();
      return 'user-2-id';
    };

    const first = outbox.save({ userId: 'user-1', date: '2026-08-30', value: 1 }, persist);
    await firstStarted.promise;
    await expect(
      outbox.save({ userId: 'user-2', date: '2026-08-30', value: 2 }, persist),
    ).resolves.toEqual({ status: 'synced', value: 'user-2-id' });
    await secondStarted.promise;
    await expect(outbox.read('user-1')).resolves.toHaveLength(1);

    firstResponse.resolve('user-1-id');
    await first;
  });

  it('retains a permanent failure as blocked and does not retry it during flush', async () => {
    const persist = jest.fn().mockRejectedValue({
      message: 'new row violates row-level security policy',
      details: null,
      hint: null,
      code: '42501',
    });

    await expect(
      outbox.save({ userId: 'user-1', date: '2026-08-30', value: 4 }, persist),
    ).resolves.toEqual({
      status: 'blocked',
      value: null,
      failure: { kind: 'permission', retryable: false, code: '42501' },
    });
    await expect(outbox.flush('user-1', persist)).resolves.toBe(0);
    expect(persist).toHaveBeenCalledTimes(1);
    await expect(outbox.read('user-1')).resolves.toEqual([
      expect.objectContaining({
        value: 4,
        failure: { kind: 'permission', retryable: false, code: '42501' },
      }),
    ]);
  });

  it('stores the sanitized 5xx failure on queued work', async () => {
    const persist = jest.fn().mockRejectedValue({
      message: 'upstream included private response text',
      status: 503,
    });

    await expect(
      outbox.save({ userId: 'user-1', date: '2026-08-30', value: 4 }, persist),
    ).resolves.toEqual({ status: 'offline', value: null });
    await expect(outbox.read('user-1')).resolves.toEqual([
      expect.objectContaining({
        failure: { kind: 'temporary-server', retryable: true, code: 'http-503' },
      }),
    ]);
  });

  it('refreshes auth once before blocking an unresolved auth failure', async () => {
    const refreshAuth = jest.fn().mockResolvedValue(undefined);
    outbox = createAsyncOutbox<Input, Item>({
      storageKey: 'test-outbox',
      belongsTo: (item, userId) => item.userId === userId,
      sameTarget: (item, input) => item.userId === input.userId && item.date === input.date,
      toItem: (input) => ({ ...input, id: `${input.userId}:${input.date}`, queuedAt: 123 }),
      refreshAuth,
    });
    const authError = { message: 'JWT expired', status: 401, code: 'session_expired' };
    const persist = jest.fn().mockRejectedValue(authError);

    await expect(
      outbox.save({ userId: 'user-1', date: '2026-08-30', value: 4 }, persist),
    ).resolves.toEqual({
      status: 'blocked',
      value: null,
      failure: { kind: 'auth', retryable: false, code: 'session-expired' },
    });
    expect(refreshAuth).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledTimes(2);
  });

  it('queues a retryable server failure after a successful auth refresh', async () => {
    const refreshAuth = jest.fn().mockResolvedValue(undefined);
    outbox = createAsyncOutbox<Input, Item>({
      storageKey: 'test-outbox',
      belongsTo: (item, userId) => item.userId === userId,
      sameTarget: (item, input) => item.userId === input.userId && item.date === input.date,
      toItem: (input) => ({ ...input, id: `${input.userId}:${input.date}`, queuedAt: 123 }),
      refreshAuth,
    });
    const persist = jest
      .fn()
      .mockRejectedValueOnce({ message: 'JWT expired', status: 401, code: 'session_expired' })
      .mockRejectedValueOnce({ message: 'upstream unavailable', status: 503 });

    await expect(
      outbox.save({ userId: 'user-1', date: '2026-08-30', value: 4 }, persist),
    ).resolves.toEqual({ status: 'offline', value: null });
    await expect(outbox.read('user-1')).resolves.toEqual([
      expect.objectContaining({
        failure: { kind: 'temporary-server', retryable: true, code: 'http-503' },
      }),
    ]);
    expect(refreshAuth).toHaveBeenCalledTimes(1);
  });

  it('keeps revisions increasing after a successful removal', async () => {
    const revisionsSeen: number[] = [];
    const persist = jest.fn(async (item: Item) => {
      revisionsSeen.push(item.revision ?? -1);
      return `saved-${item.value}`;
    });

    await expect(
      outbox.save({ userId: 'user-1', date: '2026-08-30', value: 1 }, persist),
    ).resolves.toEqual({ status: 'synced', value: 'saved-1' });
    outbox = createAsyncOutbox<Input, Item>({
      storageKey: 'test-outbox',
      belongsTo: (item, userId) => item.userId === userId,
      sameTarget: (item, input) => item.userId === input.userId && item.date === input.date,
      toItem: (input) => ({
        ...input,
        id: `${input.userId}:${input.date}`,
        queuedAt: 123,
      }),
    });
    await expect(
      outbox.save({ userId: 'user-1', date: '2026-08-30', value: 2 }, persist),
    ).resolves.toEqual({ status: 'synced', value: 'saved-2' });

    expect(revisionsSeen).toEqual([1, 2]);
    expect(JSON.parse(revisions ?? '{}')).toEqual({ 'user-1:2026-08-30': 2 });
  });

  it('throws a storage failure before starting the network request', async () => {
    mockStorage.setItem.mockRejectedValueOnce(new Error('disk full'));
    const persist = jest.fn().mockResolvedValue('saved');

    await expect(
      outbox.save({ userId: 'user-1', date: '2026-08-30', value: 1 }, persist),
    ).rejects.toThrow('disk full');
    expect(persist).not.toHaveBeenCalled();
  });

  it('throws a cleanup failure after server success and retains the acknowledged item', async () => {
    mockStorage.setItem
      .mockImplementationOnce(async (_key, value) => { stored = value; })
      .mockRejectedValueOnce(new Error('cleanup failed'));

    await expect(
      outbox.save(
        { userId: 'user-1', date: '2026-08-30', value: 1 },
        async () => 'saved',
      ),
    ).rejects.toThrow('cleanup failed');
    await expect(outbox.read('user-1')).resolves.toEqual([
      expect.objectContaining({ value: 1, revision: 1 }),
    ]);
  });
});
