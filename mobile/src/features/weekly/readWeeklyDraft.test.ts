import AsyncStorage from '@react-native-async-storage/async-storage';
import { readWeeklyDraft } from './readWeeklyDraft';
import { weeklyDraftKey } from '@/lib/weekly-feedback';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));

beforeEach(async () => { await AsyncStorage.clear(); jest.clearAllMocks(); });

it('discovers only the requested account draft without changing storage', async () => {
  await AsyncStorage.setItem(weeklyDraftKey('owner-a'), JSON.stringify({ form: { overall_feeling: 'Private draft' }, step: 2 }));
  jest.mocked(AsyncStorage.setItem).mockClear();
  expect(await readWeeklyDraft('owner-b')).toBeNull();
  expect(await readWeeklyDraft('owner-a')).toMatchObject({ form: { overall_feeling: 'Private draft' }, step: 2 });
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
});

it('reports unreadable drafts without treating them as absence or deleting answers', async () => {
  await AsyncStorage.setItem(weeklyDraftKey('owner-a'), '{broken');
  await expect(readWeeklyDraft('owner-a')).rejects.toThrow();
  expect(await AsyncStorage.getItem(weeklyDraftKey('owner-a'))).toBe('{broken');
  expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
});
