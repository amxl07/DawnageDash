import AsyncStorage from '@react-native-async-storage/async-storage';
import { findLatestWorkoutDraft, readWorkoutDraft } from './useWorkoutDraft';
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn(), getAllKeys: jest.fn() }));
const storage = jest.mocked(AsyncStorage);
const draft = { workoutTitle: 'Local', exercises: [], selectedPlanId: '1', existingLogId: 'a', savedAt: Date.now() };
let values: Map<string, string>;
beforeEach(() => {
  jest.clearAllMocks(); values = new Map();
  storage.getItem.mockImplementation(async (key) => values.get(key) ?? null);
  storage.getAllKeys.mockImplementation(async () => [...values.keys()]);
  storage.setItem.mockImplementation(async (key, value) => { values.set(key, value); });
  storage.removeItem.mockImplementation(async (key) => { values.delete(key); });
});
it('migrates a legacy draft only into its matching explicit log scope', async () => {
  values.set('workout-draft:u:2026-09-14', JSON.stringify(draft));
  expect(await readWorkoutDraft('u', '2026-09-14', 'b')).toBeNull();
  expect(await readWorkoutDraft('u', '2026-09-14', 'a')).toEqual(draft);
  expect(values.has('workout-draft:u:2026-09-14')).toBe(false);
  expect(await readWorkoutDraft('u', '2026-09-14', 'a')).toEqual(draft);
});
it('retains the legacy bytes and surfaces failed migration instead of seeding a plan', async () => {
  values.set('workout-draft:u:2026-09-14', JSON.stringify(draft));
  storage.setItem.mockRejectedValueOnce(new Error('disk full'));
  await expect(readWorkoutDraft('u', '2026-09-14', 'a')).rejects.toThrow('disk full');
  expect(values.has('workout-draft:u:2026-09-14')).toBe(true);
});
it('surfaces unreadable drafts', async () => {
  values.set('workout-draft:u:2026-09-14', '{broken');
  await expect(readWorkoutDraft('u', '2026-09-14')).rejects.toThrow();
});
it('discovers the newest account draft after midnight while retaining date and log identity', async () => {
  values.set('workout-draft:u:2026-09-14:log:a', JSON.stringify(draft));
  values.set('workout-draft:u:2026-09-15', JSON.stringify({ ...draft, existingLogId: null, savedAt: draft.savedAt - 10 }));
  values.set('workout-draft:other:2026-09-15', JSON.stringify({ ...draft, savedAt: draft.savedAt + 10 }));
  expect(await findLatestWorkoutDraft('u')).toEqual({ date: '2026-09-14', logId: 'a', savedAt: draft.savedAt });
});
