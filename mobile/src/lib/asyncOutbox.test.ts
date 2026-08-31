import AsyncStorage from '@react-native-async-storage/async-storage';

import { createAsyncOutbox } from './asyncOutbox';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

type Input = { userId: string; date: string; value: number };
type Item = Input & { id: string; queuedAt: number };

const mockStorage = jest.mocked(AsyncStorage);

describe('createAsyncOutbox', () => {
  let stored: string | null;
  let outbox: ReturnType<typeof createAsyncOutbox<Input, Item>>;

  beforeEach(() => {
    jest.clearAllMocks();
    stored = null;
    mockStorage.getItem.mockImplementation(async () => stored);
    mockStorage.setItem.mockImplementation(async (_key, value) => {
      stored = value;
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

  it('queues a failed direct save and flushes it later', async () => {
    const persist = jest
      .fn<Promise<string>, [Input | Item]>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce('saved');

    await expect(
      outbox.save({ userId: 'user-1', date: '2026-08-30', value: 4 }, persist),
    ).resolves.toEqual({ status: 'offline', value: null });
    await expect(outbox.read('user-1')).resolves.toHaveLength(1);

    await expect(outbox.flush('user-1', persist)).resolves.toBe(1);
    await expect(outbox.read('user-1')).resolves.toEqual([]);
  });

  it('does not overwrite durable data when the strict read fails', async () => {
    mockStorage.getItem.mockRejectedValueOnce(new Error('read failed'));

    await expect(
      outbox.enqueue({ userId: 'user-1', date: '2026-08-30', value: 1 }),
    ).rejects.toThrow('read failed');
    expect(mockStorage.setItem).not.toHaveBeenCalled();
  });
});
