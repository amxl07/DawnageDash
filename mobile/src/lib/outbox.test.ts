import AsyncStorage from '@react-native-async-storage/async-storage';

import { enqueue, flushOutbox, readOutbox, saveWorkoutLog } from './outbox';
import { persistWorkoutLog } from './workoutPersistence';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('./workoutPersistence', () => ({ persistWorkoutLog: jest.fn() }));

const mockStorage = jest.mocked(AsyncStorage);
const mockPersistWorkoutLog = jest.mocked(persistWorkoutLog);

const payload = (title: string, existingLogId: string | null = null) => ({
  user_id: 'user-1',
  date: '2026-08-30',
  title,
  content: JSON.stringify({ version: 2, title }),
  existingLogId,
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('workout outbox durability', () => {
  let stored: string | null;

  beforeEach(() => {
    jest.clearAllMocks();
    stored = null;
    mockStorage.getItem.mockImplementation(async () => stored);
    mockStorage.setItem.mockImplementation(async (_key, value) => {
      stored = value;
    });
    mockPersistWorkoutLog.mockResolvedValue('log-1');
  });

  it('does not let an in-flight flush overwrite a newer enqueue', async () => {
    await enqueue(payload('Original'));
    const serverResponse = deferred<{ data: null; error: null }>();
    const serverStarted = deferred<void>();
    mockPersistWorkoutLog.mockImplementationOnce(async () => {
      serverStarted.resolve();
      await serverResponse.promise;
      return 'log-1';
    });

    const flushing = flushOutbox();
    await serverStarted.promise;
    const enqueueing = enqueue(payload('Newest'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    serverResponse.resolve({ data: null, error: null });

    await expect(flushing).resolves.toBe(1);
    await enqueueing;
    await expect(readOutbox()).resolves.toEqual([
      expect.objectContaining({ title: 'Newest', content: '{"version":2,"title":"Newest"}' }),
    ]);
  });

  it('durably removes an older same-date queue item before a newer direct save', async () => {
    await enqueue(payload('Older queued'));
    mockPersistWorkoutLog.mockImplementationOnce(async () => {
      expect(stored).toBe('[]');
      return 'log-1';
    });

    await expect(saveWorkoutLog(payload('Newest direct'))).resolves.toEqual({
      status: 'synced',
      logId: 'log-1',
    });
    await expect(readOutbox()).resolves.toEqual([]);
  });

  it('lets the newest direct save win when a flush starts first', async () => {
    await enqueue(payload('Older queued'));
    const flushStarted = deferred<void>();
    const flushResponse = deferred<string>();
    let serverTitle = '';
    mockPersistWorkoutLog
      .mockImplementationOnce(async (remotePayload) => {
        flushStarted.resolve();
        const logId = await flushResponse.promise;
        serverTitle = remotePayload.title;
        return logId;
      })
      .mockImplementationOnce(async (remotePayload) => {
        serverTitle = remotePayload.title;
        return 'log-1';
      });

    const flushing = flushOutbox();
    await flushStarted.promise;
    const saving = saveWorkoutLog(payload('Newest direct'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    const titleBeforeFlushFinished = serverTitle;
    const callsBeforeFlushFinished = mockPersistWorkoutLog.mock.calls.length;
    flushResponse.resolve('log-1');

    await expect(flushing).resolves.toBe(1);
    await expect(saving).resolves.toEqual({ status: 'synced', logId: 'log-1' });
    expect(titleBeforeFlushFinished).toBe('');
    expect(callsBeforeFlushFinished).toBe(1);
    expect(serverTitle).toBe('Newest direct');
    await expect(readOutbox()).resolves.toEqual([]);
  });

  it('removes stale queued work before a direct-first save allows a flush to run', async () => {
    await enqueue(payload('Older queued'));
    const directStarted = deferred<void>();
    const directResponse = deferred<string>();
    let serverTitle = '';
    mockPersistWorkoutLog.mockImplementationOnce(async (remotePayload) => {
      directStarted.resolve();
      const logId = await directResponse.promise;
      serverTitle = remotePayload.title;
      return logId;
    });

    const saving = saveWorkoutLog(payload('Newest direct'));
    await directStarted.promise;
    const flushing = flushOutbox();
    let flushSettled = false;
    void flushing.then(() => {
      flushSettled = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const flushSettledBeforeDirect = flushSettled;
    const callsBeforeDirectFinished = mockPersistWorkoutLog.mock.calls.length;
    directResponse.resolve('created-1');

    await expect(saving).resolves.toEqual({ status: 'synced', logId: 'created-1' });
    await expect(flushing).resolves.toBe(0);
    expect(flushSettledBeforeDirect).toBe(false);
    expect(callsBeforeDirectFinished).toBe(1);
    expect(serverTitle).toBe('Newest direct');
    expect(mockPersistWorkoutLog).toHaveBeenCalledTimes(1);
    await expect(readOutbox()).resolves.toEqual([]);
  });

  it('durably replaces an older queue item with the newest payload when direct sync fails', async () => {
    await enqueue(payload('Older queued'));
    mockPersistWorkoutLog.mockRejectedValueOnce(new Error('offline'));

    await expect(saveWorkoutLog(payload('Newest offline'))).resolves.toEqual({
      status: 'offline',
      logId: null,
    });
    await expect(readOutbox()).resolves.toEqual([
      expect.objectContaining({
        title: 'Newest offline',
        content: '{"version":2,"title":"Newest offline"}',
      }),
    ]);
  });

  it('rejects before remote persistence when stale-queue removal cannot be written', async () => {
    await enqueue(payload('Older queued'));
    mockStorage.setItem.mockRejectedValueOnce(new Error('cleanup failed'));

    await expect(saveWorkoutLog(payload('Newest direct'))).rejects.toThrow('cleanup failed');
    expect(mockPersistWorkoutLog).not.toHaveBeenCalled();
    await expect(readOutbox()).resolves.toEqual([
      expect.objectContaining({ title: 'Older queued' }),
    ]);
  });

  it('rejects a direct save when its strict queue read fails', async () => {
    mockStorage.getItem.mockRejectedValueOnce(new Error('read failed'));

    await expect(saveWorkoutLog(payload('Must remain a draft'))).rejects.toThrow('read failed');
    expect(mockStorage.setItem).not.toHaveBeenCalled();
    expect(mockPersistWorkoutLog).not.toHaveBeenCalled();
  });

  it('rejects a failed offline enqueue and leaves the coordinator usable', async () => {
    mockPersistWorkoutLog.mockRejectedValueOnce(new Error('offline'));
    mockStorage.setItem
      .mockImplementationOnce(async (_key, value) => {
        stored = value;
      })
      .mockRejectedValueOnce(new Error('disk full'));

    await expect(saveWorkoutLog(payload('Not durable'))).rejects.toThrow('disk full');
    await expect(readOutbox()).resolves.toEqual([]);
    await expect(saveWorkoutLog(payload('Retry'))).resolves.toEqual({
      status: 'synced',
      logId: 'log-1',
    });
  });

  it('rejects enqueue when its durable storage write fails', async () => {
    mockStorage.setItem.mockRejectedValueOnce(new Error('disk full'));

    await expect(enqueue(payload('Keep me'))).rejects.toThrow('disk full');
  });

  it.each([
    ['storage read', new Error('read failed')],
    ['malformed JSON', null],
  ])('does not overwrite the queue after a %s failure', async (_label, readError) => {
    if (readError) mockStorage.getItem.mockRejectedValueOnce(readError);
    else mockStorage.getItem.mockResolvedValueOnce('{not-json');

    await expect(enqueue(payload('Must not overwrite'))).rejects.toBeTruthy();
    expect(mockStorage.setItem).not.toHaveBeenCalled();
  });

  it('rejects a flush read failure while the public status read stays tolerant', async () => {
    mockStorage.getItem.mockRejectedValueOnce(new Error('read failed'));
    await expect(flushOutbox()).rejects.toThrow('read failed');
    expect(mockStorage.setItem).not.toHaveBeenCalled();

    mockStorage.getItem.mockRejectedValueOnce(new Error('status read failed'));
    await expect(readOutbox()).resolves.toEqual([]);
  });

  it('retains an existing-log item when an error-free update affects no row', async () => {
    await enqueue(payload('Existing', 'log-missing'));
    mockPersistWorkoutLog.mockRejectedValueOnce(new Error('Workout update affected no row'));

    await expect(flushOutbox()).resolves.toBe(0);
    await expect(readOutbox()).resolves.toEqual([
      expect.objectContaining({ title: 'Existing', existingLogId: 'log-missing' }),
    ]);
  });

  it('retries safely when queue cleanup fails after remote persistence', async () => {
    await enqueue(payload('Replay safe'));
    mockStorage.setItem.mockRejectedValueOnce(new Error('cleanup failed'));

    await expect(flushOutbox()).rejects.toThrow('cleanup failed');
    await expect(readOutbox()).resolves.toHaveLength(1);
    await expect(flushOutbox()).resolves.toBe(1);

    expect(mockPersistWorkoutLog).toHaveBeenCalledTimes(2);
    expect(mockStorage.setItem).toHaveBeenLastCalledWith('workout-outbox', '[]');
  });
});
