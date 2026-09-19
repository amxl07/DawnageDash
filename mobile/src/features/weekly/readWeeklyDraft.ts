import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeWeeklyDraft, weeklyDraftKey } from '@/lib/weekly-feedback';

/** Read-only discovery for Home: never starts autosave or deletes local answers. */
export async function readWeeklyDraft(userId: string) {
  const raw = await AsyncStorage.getItem(weeklyDraftKey(userId));
  if (raw === null) return null;
  const draft = normalizeWeeklyDraft(JSON.parse(raw));
  if (!draft) throw new Error('Weekly draft is unavailable');
  return draft;
}
