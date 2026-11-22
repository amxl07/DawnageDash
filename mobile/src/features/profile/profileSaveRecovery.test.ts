import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearProfileSaveRecovery, markProfileRowSaved, prepareProfileSave, profileMatchesRecovery, readProfileSaveRecovery, runProfileSaveOperation, waitForProfileSaveOperation, type ProfileForm } from './profileSaveRecovery';

const mockData = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => mockData.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => { mockData.set(key, value); }),
  removeItem: jest.fn(async (key: string) => { mockData.delete(key); }),
}));
const form: ProfileForm = { name: 'Alex', phone: '', country: '', timezone: 'Asia/Kolkata', goal: 'Strength', injuries: '', allergies: '', workoutDays: '3', medicalCondition: '' };
beforeEach(() => { mockData.clear(); jest.clearAllMocks(); });

it('preserves prepared versus acknowledged profile phases and account boundaries', async () => {
  const entry = await prepareProfileSave('a', form);
  expect((await readProfileSaveRecovery('a'))?.phase).toBe('prepared');
  expect(await readProfileSaveRecovery('b')).toBeNull();
  expect(await markProfileRowSaved('a', entry.id)).toBe(true);
  expect((await readProfileSaveRecovery('a'))?.phase).toBe('profile-saved');
});
it('does not let an older completion clear or mark a newer intent', async () => {
  const first = await prepareProfileSave('a', form);
  const next = await prepareProfileSave('a', { ...form, goal: 'Recovery' });
  expect(await markProfileRowSaved('a', first.id)).toBe(false);
  expect(await clearProfileSaveRecovery('a', first.id)).toBe(false);
  expect((await readProfileSaveRecovery('a'))?.id).toBe(next.id);
});
it('propagates durable-write failures before the caller can continue', async () => {
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk unavailable'));
  await expect(prepareProfileSave('a', form)).rejects.toThrow('disk unavailable');
  expect(await readProfileSaveRecovery('a')).toBeNull();
});
it('preserves corrupt or foreign recovery instead of treating it as absent', async () => {
  mockData.set('profile-save-recovery:a', '');
  await expect(readProfileSaveRecovery('a')).rejects.toThrow();
  mockData.set('profile-save-recovery:a', '{bad');
  await expect(readProfileSaveRecovery('a')).rejects.toThrow();
  expect(mockData.has('profile-save-recovery:a')).toBe(true);
  const entry = await prepareProfileSave('b', form);
  mockData.set('profile-save-recovery:a', JSON.stringify(entry));
  await expect(readProfileSaveRecovery('a')).rejects.toThrow('unreadable');
});
it('distinguishes a committed remote row from an unacknowledged prepared intent', () => {
  const profile = { full_name: 'Alex', phone_number: null, country: null, profile_data: { ...form, primary_goal: 'performance' } };
  expect(profileMatchesRecovery(profile, form)).toBe(true);
  expect(profileMatchesRecovery(profile, { ...form, goal: 'new unacknowledged goal' })).toBe(false);
});
it('serializes same-account operations across remounts without blocking another account', async () => {
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => { finish = resolve; });
  const calls: string[] = [];
  const first = runProfileSaveOperation('a', async () => { calls.push('a1'); await pending; });
  const next = runProfileSaveOperation('a', async () => { calls.push('a2'); });
  const other = runProfileSaveOperation('b', async () => { calls.push('b'); });
  let loaded = false;
  const hydration = waitForProfileSaveOperation('a').then(() => { loaded = true; });
  await other;
  expect(calls).toEqual(['a1', 'b']);
  expect(loaded).toBe(false);
  finish();
  await Promise.all([first, next, hydration]);
  expect(calls).toEqual(['a1', 'b', 'a2']);
  expect(loaded).toBe(true);
});
