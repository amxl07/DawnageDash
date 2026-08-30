import AsyncStorage from '@react-native-async-storage/async-storage';

import { enqueue, flushOutbox, readOutbox } from './outbox';

const mockInsert = jest.fn();
const mockMaybeSingle = jest.fn();
const mockSelect = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockEq = jest.fn(() => ({ data: null, error: null, select: mockSelect }));
const mockUpdate = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn((_table: string) => ({ insert: mockInsert, update: mockUpdate }));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('./supabase', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

const mockStorage = jest.mocked(AsyncStorage);

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
    mockInsert.mockResolvedValue({ data: null, error: null });
    mockMaybeSingle.mockResolvedValue({ data: { id: 'log-1' }, error: null });
  });

  it('does not let an in-flight flush overwrite a newer enqueue', async () => {
    await enqueue(payload('Original'));
    const serverResponse = deferred<{ data: null; error: null }>();
    const serverStarted = deferred<void>();
    mockInsert.mockImplementationOnce(() => {
      serverStarted.resolve();
      return serverResponse.promise;
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

  it('retains an existing-log item when an error-free update affects no row', async () => {
    await enqueue(payload('Existing', 'log-missing'));
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

    await expect(flushOutbox()).resolves.toBe(0);
    await expect(readOutbox()).resolves.toEqual([
      expect.objectContaining({ title: 'Existing', existingLogId: 'log-missing' }),
    ]);
  });
});
