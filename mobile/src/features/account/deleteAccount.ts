import AsyncStorage from '@react-native-async-storage/async-storage';

import { cancelAll } from '@/lib/reminders';
import { supabase } from '@/lib/supabase';

/**
 * Deletes the signed-in client's account on the server (supabase/functions/delete-account),
 * then removes this device's drafts, queued saves and reminders before signing out.
 * Nothing local is touched unless the server confirms the deletion.
 */
export async function deleteAccount(signOut: () => Promise<void>): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) {
    const context = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
    const reason = await context?.json?.().then((body) => body?.error).catch(() => undefined);
    throw new Error(reason || 'Could not delete your account. Check your connection and try again.');
  }
  await cancelAll();
  await AsyncStorage.clear().catch(() => {});
  await signOut();
}
