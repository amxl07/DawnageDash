import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { isConfigured, supabaseAnonKey, supabaseUrl } from './env';

export const supabase = createClient(
  // Placeholders keep createClient from throwing when env is missing; the UI
  // gates on isConfigured before any call is made.
  isConfigured ? supabaseUrl : 'http://localhost',
  isConfigured ? supabaseAnonKey : 'public-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // No URL to parse on native; recovery links are handled by expo-linking.
      detectSessionInUrl: false,
    },
  },
);

/**
 * Port of the web app's clearCorruptAuthData(). A stale or malformed refresh
 * token wedges the client in a permanent error loop; dropping the persisted
 * session is the only recovery, and costs the user one sign-in.
 */
export async function clearCorruptAuthData(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const authKeys = keys.filter((k) => k.startsWith('sb-') && k.includes('-auth-token'));
    if (authKeys.length) await AsyncStorage.multiRemove(authKeys);
  } catch {
    // Nothing more we can do; the next sign-in will overwrite regardless.
  }
}

export function isInvalidRefreshTokenError(error: unknown): boolean {
  const message = (error as { message?: string } | null)?.message?.toLowerCase() ?? '';
  return (
    message.includes('invalid refresh token') ||
    message.includes('refresh token not found') ||
    message.includes('already used')
  );
}

/**
 * Supabase's RN guidance: auto-refresh should only run while the app is in the
 * foreground, otherwise it burns cycles and can race on resume.
 */
let appStateSubscription: { remove: () => void } | null = null;

export function startAuthAutoRefresh(): () => void {
  if (isConfigured) supabase.auth.startAutoRefresh();
  appStateSubscription?.remove();
  appStateSubscription = AppState.addEventListener('change', (state) => {
    if (!isConfigured) return;
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
  return () => {
    appStateSubscription?.remove();
    appStateSubscription = null;
    if (isConfigured) supabase.auth.stopAutoRefresh();
  };
}
