/**
 * Env access with an explicit missing-config state.
 *
 * The app must show a readable "missing configuration" screen rather than
 * crashing on a null client when mobile/.env is absent (Phase 1 acceptance).
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseUrl = url ?? '';
export const supabaseAnonKey = anonKey ?? '';

export const isConfigured = Boolean(url && anonKey);

export const missingEnvVars = [
  !url && 'EXPO_PUBLIC_SUPABASE_URL',
  !anonKey && 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
].filter(Boolean) as string[];
