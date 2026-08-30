import AsyncStorage from '@react-native-async-storage/async-storage';

import { enqueue, flushOutbox, readOutbox } from './outbox';
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
