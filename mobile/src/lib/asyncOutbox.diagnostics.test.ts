import AsyncStorage from '@react-native-async-storage/async-storage';

import { createAsyncOutbox } from './asyncOutbox';
import { setDiagnosticSink } from './diagnostics';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
afterEach(() => setDiagnosticSink());

it('reports delivery and storage categories without retained content or account identity', async () => {
  const storage = new Map<string, string>();
  jest.mocked(AsyncStorage.getItem).mockImplementation(async (key) => storage.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => { storage.set(key, value); });
  const sink = jest.fn(); setDiagnosticSink(sink);
  type Input = { userId: string; answer: string };
  const queue = createAsyncOutbox<Input, Input & { id: string; queuedAt: number }>({
    storageKey: 'diagnostic-test', diagnosticArea: 'checkin', belongsTo: (item, userId) => item.userId === userId,
    sameTarget: (a, b) => a.userId === b.userId, toItem: (input) => ({ ...input, id: input.userId, queuedAt: Date.now() }),
  });
  const input = { userId: 'private-user', answer: 'private-answer' };
  await expect(queue.save(input, async () => { throw new TypeError('Network request failed'); })).resolves.toMatchObject({ status: 'offline' });
  expect(sink).toHaveBeenLastCalledWith(expect.objectContaining({ event: 'delivery_attempt', outcome: 'queued', reason: 'transport' }));
  await expect(queue.flush(input.userId, async () => 'private-row')).resolves.toBe(1);
  expect(sink).toHaveBeenLastCalledWith(expect.objectContaining({ outcome: 'acknowledged' }));
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('private-storage-detail'));
  const remote = jest.fn();
  await expect(queue.save(input, remote)).rejects.toThrow('private-storage-detail');
  expect(remote).not.toHaveBeenCalled();
  expect(sink).toHaveBeenLastCalledWith({ event: 'delivery_storage', area: 'checkin', outcome: 'error', reason: 'local-storage' });
  expect(JSON.stringify(sink.mock.calls)).not.toContain('private-');
});
