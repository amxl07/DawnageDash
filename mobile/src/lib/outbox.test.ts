import AsyncStorage from '@react-native-async-storage/async-storage';

import { associateWorkoutOutbox, enqueue, flushOutbox, readOutbox, retryWorkoutRecovery, saveWorkoutLog, subscribeWorkoutDelivery } from './outbox';
import { persistWorkoutLog } from './workoutPersistence';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('./workoutPersistence', () => ({ persistWorkoutLog: jest.fn() }));
jest.mock('./supabase', () => ({
  supabase: { auth: { refreshSession: jest.fn() } },
}));

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
  let revisions: string | null;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPersistWorkoutLog.mockReset();
    stored = null;
    revisions = null;
    mockStorage.getItem.mockImplementation(async (key) =>
      key === 'workout-outbox' ? stored : revisions,
    );
    mockStorage.setItem.mockImplementation(async (key, value) => {
      if (key === 'workout-outbox') stored = value;
      else revisions = value;
    });
    mockPersistWorkoutLog.mockResolvedValue('log-1');
  });

  it('delivers a newer enqueue after an in-flight flush succeeds', async () => {
    await enqueue(payload('Original'));
    const serverResponse = deferred<{ data: null; error: null }>();
    const serverStarted = deferred<void>();
    const newestDelivered = deferred<void>();
    mockPersistWorkoutLog
      .mockImplementationOnce(async () => {
        serverStarted.resolve();
        await serverResponse.promise;
        return 'log-1';
      })
      .mockImplementationOnce(async () => {
        newestDelivered.resolve();
        return 'log-1';
      });

    const flushing = flushOutbox('user-1');
    await serverStarted.promise;
    const enqueueing = enqueue(payload('Newest'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    serverResponse.resolve({ data: null, error: null });

    await expect(flushing).resolves.toBe(1);
    await enqueueing;
    await newestDelivered.promise;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await expect(readOutbox('user-1')).resolves.toEqual([]);
    expect(mockPersistWorkoutLog).toHaveBeenCalledTimes(2);
  });

  it('durably replaces an older same-date queue item before a newer direct save', async () => {
    await enqueue(payload('Older queued'));
    mockPersistWorkoutLog.mockImplementationOnce(async () => {
      expect(JSON.parse(stored ?? '[]')).toEqual([
        expect.objectContaining({ title: 'Newest direct', revision: 2 }),
      ]);
      return 'log-1';
    });

    await expect(saveWorkoutLog(payload('Newest direct'))).resolves.toEqual({
      status: 'synced',
      logId: 'log-1',
    });
    await expect(readOutbox('user-1')).resolves.toEqual([]);
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

    const flushing = flushOutbox('user-1');
    await flushStarted.promise;
    const saving = saveWorkoutLog(payload('Newest direct'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    const titleBeforeFlushFinished = serverTitle;
    const callsBeforeFlushFinished = mockPersistWorkoutLog.mock.calls.length;
    flushResponse.resolve('log-1');

    await expect(flushing).resolves.toBe(1);
    await expect(saving).resolves.toEqual({ status: 'offline', logId: null });
    expect(titleBeforeFlushFinished).toBe('');
    expect(callsBeforeFlushFinished).toBe(1);
    expect(serverTitle).toBe('Newest direct');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await expect(readOutbox('user-1')).resolves.toEqual([]);
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
    const flushing = flushOutbox('user-1');
    await expect(flushing).resolves.toBe(0);
    const callsBeforeDirectFinished = mockPersistWorkoutLog.mock.calls.length;
    directResponse.resolve('created-1');

    await expect(saving).resolves.toEqual({ status: 'synced', logId: 'created-1' });
    expect(callsBeforeDirectFinished).toBe(1);
    expect(serverTitle).toBe('Newest direct');
    expect(mockPersistWorkoutLog).toHaveBeenCalledTimes(1);
    await expect(readOutbox('user-1')).resolves.toEqual([]);
  });

  it('durably replaces an older queue item with the newest payload when direct sync fails', async () => {
    await enqueue(payload('Older queued'));
    mockPersistWorkoutLog.mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(saveWorkoutLog(payload('Newest offline'))).resolves.toEqual({
      status: 'offline',
      logId: null,
    });
    await expect(readOutbox('user-1')).resolves.toEqual([
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
    await expect(readOutbox('user-1')).resolves.toEqual([
      expect.objectContaining({ title: 'Older queued' }),
    ]);
  });

  it('rejects a direct save when its strict queue read fails', async () => {
    mockStorage.getItem.mockRejectedValueOnce(new Error('read failed'));

    await expect(saveWorkoutLog(payload('Must remain a draft'))).rejects.toThrow('read failed');
    expect(mockStorage.setItem).not.toHaveBeenCalled();
    expect(mockPersistWorkoutLog).not.toHaveBeenCalled();
  });

  it('rejects a failure-metadata write error but keeps the initial durable intent', async () => {
    mockPersistWorkoutLog.mockRejectedValueOnce(new TypeError('Network request failed'));
    mockStorage.setItem
      .mockImplementationOnce(async (_key, value) => {
        stored = value;
      })
      .mockRejectedValueOnce(new Error('disk full'));

    await expect(saveWorkoutLog(payload('Still durable'))).rejects.toThrow('disk full');
    await expect(readOutbox('user-1')).resolves.toEqual([
      expect.objectContaining({ title: 'Still durable', revision: 1 }),
    ]);
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

  it('surfaces flush and public status read failures', async () => {
    mockStorage.getItem.mockRejectedValueOnce(new Error('read failed'));
    await expect(flushOutbox('user-1')).rejects.toThrow('read failed');
    expect(mockStorage.setItem).not.toHaveBeenCalled();

    mockStorage.getItem.mockRejectedValueOnce(new Error('status read failed'));
    await expect(readOutbox('user-1')).rejects.toThrow('status read failed');
  });

  it('retains an existing-log item when an error-free update affects no row', async () => {
    await enqueue(payload('Existing', 'log-missing'));
    mockPersistWorkoutLog.mockRejectedValueOnce(new Error('Workout update affected no row'));

    await expect(flushOutbox('user-1')).resolves.toBe(0);
    await expect(readOutbox('user-1')).resolves.toEqual([
      expect.objectContaining({
        title: 'Existing',
        existingLogId: 'log-missing',
        failure: { kind: 'unknown', retryable: false, code: 'unknown' },
      }),
    ]);
    await expect(flushOutbox('user-1')).resolves.toBe(0);
    expect(mockPersistWorkoutLog).toHaveBeenCalledTimes(1);
  });

  it('retries safely when queue cleanup fails after remote persistence', async () => {
    await enqueue(payload('Replay safe'));
    mockStorage.setItem.mockRejectedValueOnce(new Error('cleanup failed'));

    await expect(flushOutbox('user-1')).rejects.toThrow('cleanup failed');
    await expect(readOutbox('user-1')).resolves.toHaveLength(1);
    await expect(flushOutbox('user-1')).resolves.toBe(1);

    expect(mockPersistWorkoutLog).toHaveBeenCalledTimes(2);
    expect(mockStorage.setItem).toHaveBeenLastCalledWith('workout-outbox', '[]');
  });

  it('reads and flushes only the requested account while retaining another account queue', async () => {
    await enqueue(payload('Current account'));
    await enqueue({ ...payload('Other account'), user_id: 'user-2' });

    await expect(readOutbox('user-1')).resolves.toEqual([
      expect.objectContaining({ user_id: 'user-1', title: 'Current account' }),
    ]);
    await expect(readOutbox('user-2')).resolves.toEqual([
      expect.objectContaining({ user_id: 'user-2', title: 'Other account' }),
    ]);

    await expect(flushOutbox('user-1')).resolves.toBe(1);
    expect(mockPersistWorkoutLog).toHaveBeenCalledTimes(1);
    expect(mockPersistWorkoutLog).toHaveBeenCalledWith(
      {
        user_id: 'user-1',
        date: '2026-08-30',
        title: 'Current account',
        content: '{"version":2,"title":"Current account"}',
      },
      null,
    );
    await expect(readOutbox('user-1')).resolves.toEqual([]);
    await expect(readOutbox('user-2')).resolves.toEqual([
      expect.objectContaining({ user_id: 'user-2', title: 'Other account' }),
    ]);
  });

  it('returns blocked and preserves a sanitized Supabase permission failure', async () => {
    mockPersistWorkoutLog.mockRejectedValueOnce({
      message: 'new row violates row-level security policy for private relation',
      details: null,
      hint: null,
      code: '42501',
    });

    await expect(saveWorkoutLog(payload('Needs correction'))).resolves.toEqual({
      status: 'blocked',
      logId: null,
      failure: { kind: 'permission', retryable: false, code: '42501' },
    });
    await expect(readOutbox('user-1')).resolves.toEqual([
      expect.objectContaining({
        title: 'Needs correction',
        failure: { kind: 'permission', retryable: false, code: '42501' },
      }),
    ]);
  });
});

it('preserves two existing records on one date as separate durable targets', async () => {
  const memory = new Map<string, string>();
  mockStorage.getItem.mockImplementation(async (key) => memory.get(key) ?? null);
  mockStorage.setItem.mockImplementation(async (key, value) => { memory.set(key, value); });
  await enqueue(payload('First log', 'a'));
  await enqueue(payload('Second log', 'b'));
  expect((await readOutbox('user-1')).map((item) => item.title)).toEqual(['First log', 'Second log']);
});


it('attaches a confirmed insert id to a newer queued revision before replaying its content', async () => {
  const memory = new Map<string, string>();
  mockStorage.getItem.mockImplementation(async (key) => memory.get(key) ?? null);
  mockStorage.setItem.mockImplementation(async (key, value) => { memory.set(key, value); });
  let finish!: (value: string) => void;
  let started!: () => void;
  const began = new Promise<void>((resolve) => { started = resolve; });
  const first = new Promise<string>((resolve) => { finish = resolve; });
  let replayed!: () => void;
  const replay = new Promise<void>((resolve) => { replayed = resolve; });
  mockPersistWorkoutLog.mockReset();
  mockPersistWorkoutLog.mockImplementationOnce(async () => { started(); return first; })
    .mockImplementationOnce(async (remote, requestedId) => {
      expect(requestedId).toBe('created');
      expect(remote.title).toBe('Newest');
      expect(JSON.parse(memory.get('workout-outbox')!)).toEqual([expect.objectContaining({ existingLogId: 'created', title: 'Newest', revision: 2 })]);
      replayed(); return 'created';
    });
  const saving = saveWorkoutLog(payload('Submitted'));
  await began;
  await enqueue(payload('Newest'));
  finish('created');
  await saving; await replay;
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(await readOutbox('user-1')).toEqual([]);
});

describe('canonical workout identity durability', () => {
  let memory: Map<string, string>;
  beforeEach(() => {
    memory = new Map(); jest.clearAllMocks(); mockPersistWorkoutLog.mockReset();
    mockStorage.getItem.mockImplementation(async (key) => memory.get(key) ?? null);
    mockStorage.setItem.mockImplementation(async (key, value) => { memory.set(key, value); });
  });
  it.each(['revision-mark', 'cleanup'])('keeps the newest explicit save after %s failure and later replay', async (boundary) => {
    let remoteTitle = ''; let fail = false; let confirmed: string | null = null;
    const unsubscribe = subscribeWorkoutDelivery((event) => { if (event.kind === 'identity') confirmed = event.logId; });
    mockStorage.setItem.mockImplementation(async (key, value) => {
      if (fail && (boundary === 'revision-mark' ? key.endsWith(':revisions') : key === 'workout-outbox' && value === '[]')) { fail = false; throw new Error(boundary); }
      memory.set(key, value);
    });
    mockPersistWorkoutLog.mockImplementation(async (remote) => { remoteTitle = remote.title; if (remote.title === 'Old') fail = true; return 'created'; });
    await expect(saveWorkoutLog(payload('Old'))).rejects.toThrow(boundary);
    expect(confirmed).toBe('created');
    expect((await readOutbox('user-1'))[0].existingLogId).toBe('created');
    await saveWorkoutLog(payload('Newest', 'created'));
    await flushOutbox('user-1');
    expect(remoteTitle).toBe('Newest');
    expect(await readOutbox('user-1')).toEqual([]);
    unsubscribe();
  });
  it('does not publish an identity that could not be written and blocks an explicit split target', async () => {
    const events: unknown[] = [];
    const unsubscribe = subscribeWorkoutDelivery((event: unknown) => events.push(event));
    mockPersistWorkoutLog.mockResolvedValue('created');
    mockStorage.setItem.mockImplementation(async (key, value) => {
      if (key === 'workout-outbox' && value.includes('"existingLogId":"created"')) throw new Error('identity write failed');
      memory.set(key, value);
    });
    await expect(saveWorkoutLog(payload('Old'))).rejects.toThrow('identity write failed');
    expect(events).toEqual([]);
    await expect(saveWorkoutLog(payload('Newest', 'created'))).rejects.toMatchObject({ status: 409 });
    expect((await readOutbox('user-1'))[0].title).toBe('Old');
    expect(mockPersistWorkoutLog).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
  it('preserves a later explicit pending payload when an in-flight null target resolves to it', async () => {
    const first = deferred<string>(); const started = deferred<void>();
    let remoteTitle = ''; let lastReplay!: () => void; const replayed = new Promise<void>((resolve) => { lastReplay = resolve; });
    mockPersistWorkoutLog.mockImplementationOnce(async (remote) => { remoteTitle = remote.title; started.resolve(); return first.promise; })
      .mockImplementationOnce(async (remote, id) => { expect(id).toBe('created'); remoteTitle = remote.title; lastReplay(); return 'created'; });
    const saving = saveWorkoutLog(payload('Old'));
    await started.promise;
    // Simulate a pre-existing explicit record from an older app/process while the request is in flight.
    const pending = JSON.parse(memory.get('workout-outbox')!);
    memory.set('workout-outbox', JSON.stringify([...pending, { ...payload('Later explicit', 'created'), id: 'user-1:2026-08-30:log:created', queuedAt: 5, revision: 1 }]));
    first.resolve('created'); await saving; await replayed;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(remoteTitle).toBe('Later explicit');
    expect(await readOutbox('user-1')).toEqual([]);
  });
});


describe('deliberate workout recovery association', () => {
  let memory: Map<string, string>;
  beforeEach(() => {
    memory = new Map(); jest.clearAllMocks(); mockPersistWorkoutLog.mockReset();
    mockStorage.getItem.mockImplementation(async (key) => memory.get(key) ?? null);
    mockStorage.setItem.mockImplementation(async (key, value) => { memory.set(key, value); });
  });
  const selection = (revision: number) => ({ userId: 'user-1', date: '2026-08-30', outboxId: 'user-1:2026-08-30', revision, logId: 'chosen', title: 'Recovered', content: 'retained payload' });
  it('moves preserved content to the chosen target and requires an explicit successful retry', async () => {
    await enqueue(payload('Recovered'));
    const [source] = await readOutbox('user-1');
    const associated = await associateWorkoutOutbox(selection(source.revision!));
    expect(await readOutbox('user-1')).toEqual([expect.objectContaining({ id: 'user-1:2026-08-30:log:chosen', existingLogId: 'chosen', title: 'Recovered', content: 'retained payload', failure: { kind: 'conflict', retryable: false, code: 'review-required' } })]);
    expect(await flushOutbox('user-1')).toBe(0);
    mockPersistWorkoutLog.mockResolvedValue('chosen');
    expect(await saveWorkoutLog({ ...payload(associated.title, associated.existingLogId), content: associated.content })).toEqual({ status: 'synced', logId: 'chosen' });
    expect(mockPersistWorkoutLog).toHaveBeenCalledWith(expect.objectContaining({ content: 'retained payload' }), 'chosen');
    expect(await readOutbox('user-1')).toEqual([]);
  });
  it('retains both records when the chosen target already has queued content', async () => {
    await enqueue(payload('Source'));
    const [source] = await readOutbox('user-1');
    // Existing mixed-target data can come from an earlier app version.
    memory.set('workout-outbox', JSON.stringify([source, { ...payload('Destination', 'chosen'), id: 'user-1:2026-08-30:log:chosen', queuedAt: 2, revision: 3 }]));
    await expect(associateWorkoutOutbox(selection(source.revision!))).rejects.toThrow('already has local changes');
    expect((await readOutbox('user-1')).map((item) => item.title)).toEqual(['Source', 'Destination']);
  });
  it('rejects another owner or stale revision and preserves the source when the move cannot be written', async () => {
    await enqueue(payload('Source'));
    const [source] = await readOutbox('user-1');
    await expect(associateWorkoutOutbox({ ...selection(source.revision!), userId: 'other' })).rejects.toThrow('changed');
    await expect(associateWorkoutOutbox(selection(source.revision! + 1))).rejects.toThrow('changed');
    mockStorage.setItem.mockImplementation(async (key, value) => { if (key === 'workout-outbox') throw new Error('move failed'); memory.set(key, value); });
    await expect(associateWorkoutOutbox(selection(source.revision!))).rejects.toThrow('move failed');
    expect(await readOutbox('user-1')).toEqual([source]);
  });
  it('publishes a durable blocked receipt when a background retry becomes permanent', async () => {
    const events: unknown[] = [];
    const stop = subscribeWorkoutDelivery((event) => events.push(event));
    mockPersistWorkoutLog.mockRejectedValueOnce(new TypeError('Network request failed'));
    await saveWorkoutLog(payload('Waiting'));
    const [source] = await readOutbox('user-1');
    mockPersistWorkoutLog.mockRejectedValueOnce({ status: 403 });
    await flushOutbox('user-1');
    expect(events.at(-1)).toMatchObject({ kind: 'state', userId: 'user-1', date: '2026-08-30', receipt: { id: source.id, revision: source.revision }, status: 'blocked' });
    expect((await readOutbox('user-1'))[0].failure).toEqual({ kind: 'permission', retryable: false, code: 'http-403' });
    stop();
  });
});

describe('retained mixed-target flush ordering', () => {
  let memory: Map<string, string>;
  const retained = (title: string, existingLogId: string | null, order: number) => ({ ...payload(title, existingLogId), id: `user-1:2026-08-30${existingLogId ? `:log:${existingLogId}` : ''}`, revision: 1, queuedAt: order });
  beforeEach(() => {
    memory = new Map(); jest.clearAllMocks(); mockPersistWorkoutLog.mockReset();
    mockStorage.getItem.mockImplementation(async (key) => memory.get(key) ?? null);
    mockStorage.setItem.mockImplementation(async (key, value) => { memory.set(key, value); });
  });
  it.each([1, 2])('keeps a newer retained explicit payload when its response gate resolves first (%i flush calls)', async (flushes) => {
    memory.set('workout-outbox', JSON.stringify([retained('Old', null, 1), retained('Newest', 'a', 2)]));
    const oldResponse = deferred<void>(); const explicitResponse = deferred<void>(); const began = deferred<void>();
    let remoteTitle = '';
    mockPersistWorkoutLog.mockImplementation(async (remote) => {
      if (remote.title === 'Old') { began.resolve(); await oldResponse.promise; } else await explicitResponse.promise;
      remoteTitle = remote.title; return 'a';
    });
    const attempts = Array.from({ length: flushes }, () => flushOutbox('user-1'));
    await began.promise;
    explicitResponse.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const requestsBeforeOldFinished = mockPersistWorkoutLog.mock.calls.length;
    const beforeOldFinished = await readOutbox('user-1');
    oldResponse.resolve(); await Promise.all(attempts);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(requestsBeforeOldFinished).toBe(1);
    expect(beforeOldFinished.map((item) => item.title)).toEqual(['Old', 'Newest']);
    expect(remoteTitle).toBe('Newest');
    expect(await readOutbox('user-1')).toEqual([]);
  });
  it('retains the later payload when its unknown predecessor fails, then carries it through retry', async () => {
    memory.set('workout-outbox', JSON.stringify([retained('Old', null, 1), retained('Newest', 'a', 2)]));
    mockPersistWorkoutLog.mockRejectedValueOnce(new TypeError('Network request failed')).mockResolvedValue('a');
    await flushOutbox('user-1');
    expect(mockPersistWorkoutLog).toHaveBeenCalledTimes(1);
    expect((await readOutbox('user-1')).map((item) => item.title)).toEqual(['Old', 'Newest']);
    await flushOutbox('user-1');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockPersistWorkoutLog.mock.calls.at(-1)).toEqual([expect.objectContaining({ title: 'Newest' }), 'a']);
    expect(await readOutbox('user-1')).toEqual([]);
  });
  it('does not bypass a permanently blocked unknown predecessor', async () => {
    const blocked = { ...retained('Old', null, 1), failure: { kind: 'permission', retryable: false, code: 'http-403' } };
    memory.set('workout-outbox', JSON.stringify([blocked, retained('Newest', 'a', 2)]));
    mockPersistWorkoutLog.mockResolvedValue('a');
    expect(await flushOutbox('user-1')).toBe(0);
    expect(mockPersistWorkoutLog).not.toHaveBeenCalled();
    expect((await readOutbox('user-1')).map((item) => item.title)).toEqual(['Old', 'Newest']);
  });
  it('drains an earlier unrelated explicit target before resolving a mixed group without losing later work', async () => {
    memory.set('workout-outbox', JSON.stringify([retained('Separate B', 'b', 1), retained('Old', null, 2), retained('Newest', 'a', 3)]));
    const remote = new Map<string, string>();
    mockPersistWorkoutLog.mockImplementation(async (data, id) => { remote.set(id ?? 'a', data.title); return id ?? 'a'; });
    await flushOutbox('user-1');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(remote.get('b')).toBe('Separate B');
    expect(remote.get('a')).toBe('Newest');
    expect(await readOutbox('user-1')).toEqual([]);
  });
});


describe('deliberate exact retained recovery', () => {
  let memory: Map<string, string>;
  const old = { ...payload('Earlier'), id: 'user-1:2026-08-30', revision: 5, queuedAt: 1, failure: { kind: 'permission' as const, retryable: false, code: 'http-403' } };
  const latest = { ...payload('Later', 'a'), id: 'user-1:2026-08-30:log:a', revision: 8, queuedAt: 2 };
  const input = (viewed = old) => ({ userId: 'user-1', date: '2026-08-30', predecessor: { id: old.id, revision: 5 }, viewed: { id: viewed.id, revision: viewed.revision }, targetLogId: 'a' });
  beforeEach(() => {
    memory = new Map([['workout-outbox', JSON.stringify([old, latest])]]);
    jest.clearAllMocks(); mockPersistWorkoutLog.mockReset();
    mockStorage.getItem.mockImplementation(async (key) => memory.get(key) ?? null);
    mockStorage.setItem.mockImplementation(async (key, value) => { memory.set(key, value); });
  });
  it.each(['earlier', 'later'])('recovers from the %s entry without changing payloads or order and waits for the last delivery', async (entry) => {
    const final = deferred<string>(); const beganFinal = deferred<void>(); let settled = false; let beforeRequest: any[] = [];
    mockPersistWorkoutLog.mockImplementationOnce(async () => {
      beforeRequest = JSON.parse(memory.get('workout-outbox')!); return 'a';
    }).mockImplementationOnce(async () => { beganFinal.resolve(); return final.promise; });
    const retry = retryWorkoutRecovery(input(entry === 'earlier' ? old : { ...old, ...latest })).then((result) => { settled = true; return result; });
    await beganFinal.promise;
    expect(settled).toBe(false);
    expect(beforeRequest.map((item) => [item.title, item.content, item.queuedAt])).toEqual([[old.title, old.content, 1], [latest.title, latest.content, 2]]);
    expect(beforeRequest[0].retryLogId).toBe('a'); expect(beforeRequest[0].failure).toBeUndefined();
    expect(mockPersistWorkoutLog.mock.calls.map(([data, id]) => [data.title, id])).toEqual([['Earlier', 'a'], ['Later', 'a']]);
    expect((await readOutbox('user-1'))[0].title).toBe('Later');
    final.resolve('a');
    expect(await retry).toMatchObject({ status: 'synced', logId: 'a', outboxId: null });
    expect(await readOutbox('user-1')).toEqual([]);
  });
  it('keeps ordinary mixed intents guarded while permitting only the exact retained retry', async () => {
    await expect(saveWorkoutLog(payload('New null'))).rejects.toMatchObject({ status: 409 });
    await expect(saveWorkoutLog(payload('New explicit', 'a'))).rejects.toMatchObject({ status: 409 });
    await expect(retryWorkoutRecovery({ ...input(), userId: 'other' })).rejects.toThrow();
    await expect(retryWorkoutRecovery({ ...input(), predecessor: { id: old.id, revision: 4 } })).rejects.toThrow();
    await expect(retryWorkoutRecovery({ ...input(), viewed: { id: latest.id, revision: 7 } })).rejects.toThrow();
    await expect(retryWorkoutRecovery({ ...input(), targetLogId: 'unrelated' })).rejects.toThrow();
    expect(mockPersistWorkoutLog).not.toHaveBeenCalled();
    expect(await readOutbox('user-1')).toEqual([old, latest]);
  });
  it('preserves both versions when selected identity cannot be written', async () => {
    mockStorage.setItem.mockRejectedValueOnce(new Error('disk full'));
    await expect(retryWorkoutRecovery(input())).rejects.toThrow('disk full');
    expect(mockPersistWorkoutLog).not.toHaveBeenCalled();
    expect(await readOutbox('user-1')).toEqual([old, latest]);
  });
  it('uses the durably selected ID on a later flush after failed recovery', async () => {
    mockPersistWorkoutLog.mockRejectedValueOnce(new TypeError('Network request failed'));
    expect(await retryWorkoutRecovery(input())).toMatchObject({ status: 'queued', logId: null, outboxId: old.id });
    const retained = await readOutbox('user-1');
    expect(retained.map((item) => item.title)).toEqual(['Earlier', 'Later']);
    expect(retained[0]).toMatchObject({ retryLogId: 'a', failure: { retryable: true } });
    mockPersistWorkoutLog.mockResolvedValue('a');
    await flushOutbox('user-1'); await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockPersistWorkoutLog.mock.calls.map(([, id]) => id)).toEqual(['a', 'a', 'a']);
    expect(mockPersistWorkoutLog.mock.calls.at(-1)![0].title).toBe('Later');
    expect(await readOutbox('user-1')).toEqual([]);
  });
  it('does not allow a second deliberate retry during active delivery', async () => {
    const remote = deferred<string>(); const began = deferred<void>();
    mockPersistWorkoutLog.mockImplementationOnce(async () => { began.resolve(); return remote.promise; }).mockResolvedValue('a');
    const first = retryWorkoutRecovery(input()); await began.promise;
    const active = (await readOutbox('user-1'))[0];
    await expect(retryWorkoutRecovery({ ...input(), predecessor: { id: active.id, revision: active.revision! }, viewed: { id: latest.id, revision: latest.revision } })).rejects.toMatchObject({ status: 409 });
    expect(mockPersistWorkoutLog).toHaveBeenCalledTimes(1);
    remote.resolve('a'); await first;
    expect(await readOutbox('user-1')).toEqual([]);
  });
  it('preserves the selected association when canonicalization fails after remote success', async () => {
    let failCanonicalWrite = true;
    mockStorage.setItem.mockImplementation(async (key, value) => {
      if (key === 'workout-outbox' && failCanonicalWrite && !(JSON.parse(value) as { existingLogId: string | null }[]).some((item) => item.existingLogId === null)) {
        failCanonicalWrite = false;
        throw new Error('canonical disk write failed');
      }
      memory.set(key, value);
    });
    mockPersistWorkoutLog.mockResolvedValue('a');
    await expect(retryWorkoutRecovery(input())).rejects.toThrow('canonical disk write failed');
    const retained = await readOutbox('user-1');
    expect(retained.map((item) => [item.title, item.content, item.queuedAt])).toEqual([[old.title, old.content, 1], [latest.title, latest.content, 2]]);
    expect(retained[0].retryLogId).toBe('a');
    await flushOutbox('user-1'); await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockPersistWorkoutLog.mock.calls.map(([data, id]) => [data.title, id])).toEqual([['Earlier', 'a'], ['Earlier', 'a'], ['Later', 'a']]);
    expect(await readOutbox('user-1')).toEqual([]);
  });
  it('returns the later blocked receipt instead of the predecessor success', async () => {
    mockPersistWorkoutLog.mockResolvedValueOnce('a').mockRejectedValueOnce({ status: 403 });
    expect(await retryWorkoutRecovery(input())).toMatchObject({ status: 'blocked', logId: 'a', outboxId: latest.id });
    expect(await readOutbox('user-1')).toEqual([expect.objectContaining({ title: 'Later', existingLogId: 'a', failure: expect.objectContaining({ retryable: false }) })]);
  });

  it.each(['explicit', 'later-null'])('recovers an explicit-first blocked group from the %s entry in order', async (entry) => {
    const explicit = { ...payload('Earlier explicit', 'a'), id: 'user-1:2026-08-30:log:a', revision: 3, queuedAt: 1, failure: { kind: 'permission' as const, retryable: false, code: 'http-403' } };
    const laterNull = { ...payload('Later unscoped'), id: 'user-1:2026-08-30', revision: 6, queuedAt: 2 };
    memory.set('workout-outbox', JSON.stringify([explicit, laterNull]));
    mockPersistWorkoutLog.mockResolvedValueOnce('a').mockRejectedValueOnce(new TypeError('Network request failed'));

    const viewed = entry === 'explicit' ? explicit : laterNull;
    const result = await retryWorkoutRecovery({ userId: 'user-1', date: '2026-08-30', predecessor: { id: explicit.id, revision: 3 }, viewed: { id: viewed.id, revision: viewed.revision }, targetLogId: 'a' });

    expect(mockPersistWorkoutLog.mock.calls.map(([data, id]) => [data.title, id])).toEqual([
      ['Earlier explicit', 'a'],
      ['Later unscoped', 'a'],
    ]);
    expect(result).toMatchObject({ status: 'queued', logId: 'a', outboxId: laterNull.id });
    expect(await readOutbox('user-1')).toEqual([
      expect.objectContaining({ title: 'Later unscoped', retryLogId: 'a', failure: expect.objectContaining({ retryable: true }) }),
    ]);
  });

  it('resumes explicit predecessors in order before delivering the selected unscoped version', async () => {
    const explicitA = { ...payload('Explicit A', 'a'), id: 'user-1:2026-08-30:log:a', revision: 3, queuedAt: 1, failure: { kind: 'permission' as const, retryable: false, code: 'http-403' } };
    const explicitB = { ...payload('Explicit B', 'b'), id: 'user-1:2026-08-30:log:b', revision: 4, queuedAt: 2, failure: { kind: 'permission' as const, retryable: false, code: 'http-403' } };
    const laterNull = { ...payload('Later unscoped'), id: 'user-1:2026-08-30', revision: 6, queuedAt: 3 };
    memory.set('workout-outbox', JSON.stringify([explicitA, explicitB, laterNull]));
    mockPersistWorkoutLog.mockResolvedValueOnce('a').mockRejectedValueOnce(new TypeError('Network request failed'));

    const interrupted = await retryWorkoutRecovery({ userId: 'user-1', date: '2026-08-30', predecessor: { id: explicitA.id, revision: 3 }, viewed: { id: laterNull.id, revision: 6 }, targetLogId: 'a' });

    expect(mockPersistWorkoutLog.mock.calls.map(([data, id]) => [data.title, id])).toEqual([
      ['Explicit A', 'a'],
      ['Explicit B', 'b'],
    ]);
    expect(interrupted).toMatchObject({ status: 'queued', logId: null, outboxId: explicitB.id, receipt: { id: explicitB.id, existingLogId: 'b' } });
    const retainedAfterFailure = await readOutbox('user-1');
    expect(retainedAfterFailure).toEqual([
      expect.objectContaining({ id: explicitB.id, existingLogId: 'b', failure: expect.objectContaining({ retryable: true }) }),
      expect.objectContaining({ id: laterNull.id, existingLogId: null, retryLogId: 'a' }),
    ]);

    mockPersistWorkoutLog.mockResolvedValueOnce('b').mockResolvedValueOnce('a');
    const resumed = await retryWorkoutRecovery({ userId: 'user-1', date: '2026-08-30', predecessor: { id: explicitB.id, revision: retainedAfterFailure[0].revision! }, viewed: { id: laterNull.id, revision: retainedAfterFailure[1].revision! }, targetLogId: 'a' });

    expect(mockPersistWorkoutLog.mock.calls.slice(2).map(([data, id]) => [data.title, id])).toEqual([
      ['Explicit B', 'b'],
      ['Later unscoped', 'a'],
    ]);
    expect(resumed).toMatchObject({ status: 'synced', logId: 'a', outboxId: null });
    expect(await readOutbox('user-1')).toEqual([]);
  });

  it.each(['a', 'b'])('recovers blocked A/null/B in its original order when null targets %s', async (targetLogId) => {
    const blocked = { kind: 'permission' as const, retryable: false, code: 'http-403' };
    const a = { ...latest, title: 'A first', content: 'A bytes', revision: 3, queuedAt: 1, failure: blocked };
    const middle = { ...old, title: 'Null middle', content: 'Null bytes', queuedAt: 2 };
    const b = { ...latest, id: 'user-1:2026-08-30:log:b', existingLogId: 'b', title: 'B last', content: 'B bytes', queuedAt: 3, failure: blocked };
    const unrelated = { ...b, user_id: 'other', id: 'other:2026-08-30:log:b', content: 'Other account bytes' };
    memory.set('workout-outbox', JSON.stringify([a, unrelated, middle, b]));
    let firstRequest = true;
    mockPersistWorkoutLog.mockImplementation(async (_data, id) => {
      if (firstRequest) {
        firstRequest = false;
        const durable = JSON.parse(memory.get('workout-outbox')!);
        expect(durable.map((item: typeof old) => [item.id, item.content, item.queuedAt])).toEqual([a, unrelated, middle, b].map((item) => [item.id, item.content, item.queuedAt]));
        expect(durable.find((item: typeof old) => item.id === middle.id)).toMatchObject({ retryLogId: targetLogId });
      }
      return id!;
    });
    expect(await retryWorkoutRecovery({ ...input(middle), predecessor: { id: a.id, revision: a.revision }, targetLogId })).toMatchObject({ status: 'synced', logId: targetLogId, outboxId: null });
    expect(mockPersistWorkoutLog.mock.calls.map(([data, id]) => [data.title, data.content, id])).toEqual([
      ['A first', 'A bytes', 'a'], ['Null middle', 'Null bytes', targetLogId], ['B last', 'B bytes', 'b'],
    ]);
    expect(await readOutbox('user-1')).toEqual([]);
    expect(await readOutbox('other')).toEqual([unrelated]);
  });

  it.each([
    { targetLogId: 'a', failedTitle: 'A first', permanent: true },
    { targetLogId: 'a', failedTitle: 'Null middle', permanent: false },
    { targetLogId: 'a', failedTitle: 'B last', permanent: true },
    { targetLogId: 'b', failedTitle: 'Null middle', permanent: true },
    { targetLogId: 'b', failedTitle: 'B last', permanent: false },
  ])('resumes A/null/B after $failedTitle fails with selection $targetLogId', async ({ targetLogId, failedTitle, permanent }) => {
    const blocked = { kind: 'permission' as const, retryable: false, code: 'http-403' };
    const a = { ...latest, title: 'A first', content: 'A bytes', revision: 3, queuedAt: 1, failure: blocked };
    const middle = { ...old, title: 'Null middle', content: 'Null bytes', queuedAt: 2 };
    const b = { ...latest, id: 'user-1:2026-08-30:log:b', existingLogId: 'b', title: 'B last', content: 'B bytes', queuedAt: 3, failure: blocked };
    memory.set('workout-outbox', JSON.stringify([a, middle, b]));
    mockPersistWorkoutLog.mockImplementation(async (data, id) => {
      if (data.title === failedTitle) throw permanent ? { status: 403 } : new TypeError('Network request failed');
      return id!;
    });
    const failed = await retryWorkoutRecovery({ ...input(middle), predecessor: { id: a.id, revision: a.revision }, targetLogId });
    expect(failed.status).toBe(permanent ? 'blocked' : 'queued');
    expect(failed.receipt.existingLogId).toBe(failedTitle === 'A first' ? 'a' : failedTitle === 'B last' ? 'b' : null);
    if (targetLogId === 'a') expect(failed.logId).toBeNull();
    const remaining = await readOutbox('user-1');
    expect(remaining.map((item) => [item.title, item.content, item.queuedAt])).toEqual((failedTitle === 'A first' ? [a, middle, b] : failedTitle === 'B last' ? [b] : [middle, b]).map((item) => [item.title, item.content, item.queuedAt]));
    const request = { ...input(), predecessor: { id: remaining[0].id, revision: remaining[0].revision! }, viewed: { id: remaining[0].id, revision: remaining[0].revision! }, targetLogId };
    await expect(retryWorkoutRecovery({ ...request, predecessor: { ...request.predecessor, revision: request.predecessor.revision - 1 } })).rejects.toMatchObject({ status: 409 });
    mockPersistWorkoutLog.mockClear();
    mockPersistWorkoutLog.mockImplementation(async (_data, id) => id!);
    expect(await retryWorkoutRecovery(request)).toMatchObject({ status: 'synced', logId: targetLogId, outboxId: null });
    expect(mockPersistWorkoutLog.mock.calls.map(([data, id]) => [data.title, id])).toEqual(failedTitle === 'A first' ? [['A first', 'a'], ['Null middle', targetLogId], ['B last', 'b']] : failedTitle === 'B last' ? [['B last', 'b']] : [['Null middle', targetLogId], ['B last', 'b']]);
    expect(await readOutbox('user-1')).toEqual([]);
  });

  it('keeps A/null/B chronology when cleanup is interrupted after the middle identity is committed', async () => {
    const a = { ...latest, title: 'A first', queuedAt: 1 };
    const middle = { ...old, title: 'Null middle', queuedAt: 2 };
    const b = { ...latest, id: 'user-1:2026-08-30:log:b', existingLogId: 'b', title: 'B last', queuedAt: 3, failure: old.failure };
    memory.set('workout-outbox', JSON.stringify([a, middle, b]));
    let failCleanup = true;
    mockStorage.setItem.mockImplementation(async (key, value) => {
      const items = key === 'workout-outbox' ? JSON.parse(value) as typeof old[] : [];
      if (failCleanup && items.length === 1 && items[0].title === 'B last') {
        failCleanup = false;
        throw new Error('cleanup interrupted');
      }
      memory.set(key, value);
    });
    mockPersistWorkoutLog.mockImplementation(async (_data, id) => id!);
    await expect(retryWorkoutRecovery({ ...input(middle), predecessor: { id: a.id, revision: a.revision } })).rejects.toThrow('cleanup interrupted');
    const remaining = await readOutbox('user-1');
    expect(remaining.map((item) => [item.title, item.existingLogId])).toEqual([['Null middle', 'a'], ['B last', 'b']]);
    const first = { id: remaining[0].id, revision: remaining[0].revision! };
    expect(await retryWorkoutRecovery({ ...input(), predecessor: first, viewed: first })).toMatchObject({ status: 'synced', logId: 'a' });
    expect(mockPersistWorkoutLog.mock.calls.map(([data, id]) => [data.title, id])).toEqual([['A first', 'a'], ['Null middle', 'a'], ['Null middle', 'a'], ['B last', 'b']]);
    expect(await readOutbox('user-1')).toEqual([]);
  });

});
