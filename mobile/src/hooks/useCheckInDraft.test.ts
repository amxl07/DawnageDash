import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';

import { EMPTY_FORM } from '@/features/checkin/model';
import { clearCheckInDraftIfUnchanged, findLatestCheckInDraft, readCheckInDraft, useCheckInDraft } from './useCheckInDraft';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn(), getAllKeys: jest.fn() }));
const storage = jest.mocked(AsyncStorage);
function deferred() { let resolve!: () => void; const promise = new Promise<void>((done) => { resolve = done; }); return { promise, resolve }; }
const key = (user = 'u', date = '2026-09-14') => `check-in-draft:${user}:${date}`;
const form = (notes: string) => ({ ...EMPTY_FORM, notes });
let disk: Map<string, string>;

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-09-15T12:00:00Z'));
  jest.clearAllMocks();
  disk = new Map();
  storage.getItem.mockImplementation(async (name) => disk.get(name) ?? null);
  storage.setItem.mockImplementation(async (name, value) => { disk.set(name, value); });
  storage.removeItem.mockImplementation(async (name) => { disk.delete(name); });
  storage.getAllKeys.mockImplementation(async () => [...disk.keys()]);
});
afterEach(() => { jest.useRealTimers(); });

it('serializes a write, clear, then newer edit without resurrecting the old value', async () => {
  const first = deferred();
  storage.setItem.mockImplementationOnce(async (name, value) => { await first.promise; disk.set(name, value); });
  const { result } = await renderHook(() => useCheckInDraft('u', '2026-09-14'));
  let save!: Promise<boolean>, clear!: Promise<boolean>, latest!: Promise<boolean>;
  await act(async () => { save = result.current.saveDraftNow(form('first'), 1); clear = result.current.clearDraft(); latest = result.current.saveDraftNow(form('latest'), 3); });
  expect(storage.removeItem).not.toHaveBeenCalled();
  await act(async () => { first.resolve(); await Promise.all([save, clear, latest]); });
  expect(JSON.parse(disk.get(key())!).form.notes).toBe('latest');
  expect(result.current.draftStatus).toBe('saved');
});

it('flushes the latest edit inside debounce and on unmount', async () => {
  const { result, unmount } = await renderHook(() => useCheckInDraft('u', '2026-09-14'));
  await act(async () => { result.current.saveDraft(form('first'), 0); result.current.saveDraft(form('latest'), 2); });
  await unmount();
  await act(async () => { await Promise.resolve(); });
  expect(JSON.parse(disk.get(key())!).form.notes).toBe('latest');
});

it('finishes an old scope write without applying its saved status to a new account', async () => {
  const first = deferred();
  storage.setItem.mockImplementationOnce(async (name, value) => { await first.promise; disk.set(name, value); });
  const { result, rerender } = await renderHook<ReturnType<typeof useCheckInDraft>, { user: string }>(({ user }) => useCheckInDraft(user, '2026-09-14'), { initialProps: { user: 'u' } });
  await act(async () => { result.current.saveDraft(form('private'), 1); });
  await rerender({ user: 'other' });
  await act(async () => { first.resolve(); await Promise.resolve(); });
  expect(result.current.draftStatus).toBe('idle');
  expect(disk.has(key('other'))).toBe(false);
  expect(JSON.parse(disk.get(key())!).form.notes).toBe('private');
});

it('loads the legacy shape and step, expires drafts only, and discovers a backfill by savedAt', async () => {
  disk.set(key(), JSON.stringify({ form: form('legacy'), step: 3, savedAt: Date.now() - 10 }));
  disk.set(key('u', '2026-08-20'), JSON.stringify({ form: form('backfill'), step: 2, savedAt: Date.now() }));
  disk.set(key('other'), JSON.stringify({ form: form('private'), step: 0, savedAt: Date.now() + 1 }));
  disk.set(key('u', '2026-09-10'), JSON.stringify({ form: form('expired'), step: 1, savedAt: Date.now() - 259200001 }));
  disk.set('checkin-outbox', 'queued payload');
  await expect(readCheckInDraft('u', '2026-09-14')).resolves.toMatchObject({ step: 3, form: form('legacy') });
  await expect(findLatestCheckInDraft('u')).resolves.toEqual({ date: '2026-08-20', savedAt: Date.now() });
  expect(disk.has(key('u', '2026-09-10'))).toBe(false);
  expect(disk.get('checkin-outbox')).toBe('queued payload');
});

it('surfaces storage and corruption errors and allows a failed write to retry', async () => {
  disk.set(key(), '{broken');
  await expect(readCheckInDraft('u', '2026-09-14')).rejects.toThrow();
  storage.getItem.mockRejectedValueOnce(new Error('unavailable'));
  await expect(readCheckInDraft('u', '2026-09-14')).rejects.toThrow('unavailable');
  const { result } = await renderHook(() => useCheckInDraft('u', '2026-09-14'));
  storage.setItem.mockRejectedValueOnce(new Error('full'));
  await act(async () => { expect(await result.current.saveDraftNow(form('keep'), 0)).toBe(false); });
  expect(result.current.draftStatus).toBe('error');
  await act(async () => { expect(await result.current.saveDraftNow(form('keep'), 0)).toBe(true); });
  expect(result.current.draftStatus).toBe('saved');
});


it('clears an acknowledged inactive draft only if that account/date still contains its snapshot', async () => {
  disk.set(key(), JSON.stringify({ form: form('newer'), step: 1, savedAt: Date.now() }));
  await expect(clearCheckInDraftIfUnchanged('u', '2026-09-14', form('submitted'))).resolves.toBe(false);
  expect(JSON.parse(disk.get(key())!).form.notes).toBe('newer');
  await expect(clearCheckInDraftIfUnchanged('u', '2026-09-14', form('newer'))).resolves.toBe(true);
  expect(disk.has(key())).toBe(false);
});
