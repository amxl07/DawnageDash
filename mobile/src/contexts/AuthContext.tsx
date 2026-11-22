import type { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { isConfigured } from '@/lib/env';
import {
  clearCorruptAuthData,
  isInvalidRefreshTokenError,
  startAuthAutoRefresh,
  supabase,
} from '@/lib/supabase';

const RECOVERY_KEY = 'password-recovery-pending';

export type AppRole = 'client' | 'coach' | 'admin';

type AuthValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** From user_metadata.role — the mobile app serves 'client' only. */
  role: AppRole | null;
  /** True between a PASSWORD_RECOVERY event and a completed password change. */
  passwordRecoveryPending: boolean;
  setPasswordRecoveryPending: (v: boolean) => void;
  signOut: () => Promise<void>;
  retryRole: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecoveryPending, setRecoveryState] = useState(false);
  const signingOut = useRef(false);
  const authGeneration = useRef(0);

  const setPasswordRecoveryPending = useCallback((v: boolean) => {
    setRecoveryState(v);
    if (v) AsyncStorage.setItem(RECOVERY_KEY, '1').catch(() => {});
    else AsyncStorage.removeItem(RECOVERY_KEY).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    let active = true;
    let hydrated = false;
    let eventSession: Session | null | undefined;
    const stopAutoRefresh = startAuthAutoRefresh();

    // An interrupted recovery must resume on next launch rather than dropping
    // the user into the app with a password they never finished changing.
    Promise.all([
      AsyncStorage.getItem(RECOVERY_KEY).catch(() => null),
      supabase.auth.getSession(),
    ])
      .then(async ([recovery, { data, error }]) => {
        if (!active) return;
        if (error && isInvalidRefreshTokenError(error)) {
          await clearCorruptAuthData();
          if (active) setSession(null);
        } else {
          const next = signingOut.current ? null : eventSession === undefined ? data.session : eventSession;
          setSession(next);
          if (recovery === '1' && next) setRecoveryState(true);
        }
      })
      .catch(async (error) => {
        if (isInvalidRefreshTokenError(error)) await clearCorruptAuthData();
        if (active) setSession(null);
      })
      .finally(() => { hydrated = true; if (active) setLoading(false); });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      if (signingOut.current && event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') return;
      if (event === 'SIGNED_IN') { signingOut.current = false; authGeneration.current += 1; }
      eventSession = next;
      setSession(next);
      if (hydrated) setLoading(false);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecoveryPending(true);
      if (event === 'SIGNED_OUT') setPasswordRecoveryPending(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      stopAutoRefresh();
    };
  }, [setPasswordRecoveryPending]);

  const signOut = useCallback(async () => {
    signingOut.current = true;
    const generation = ++authGeneration.current;
    // Clear the authenticated route in the same transition as recovery.
    setSession(null);
    setPasswordRecoveryPending(false);
    try {
      await supabase.auth.signOut();
    } catch {
      // The local sign-out still succeeds when the remote service is unavailable.
    } finally {
      // Even if the network call fails, drop local state so the user is not
      // trapped in a session they asked to leave.
      if (authGeneration.current === generation) await clearCorruptAuthData();
    }
  }, [setPasswordRecoveryPending]);

  const retryRole = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    setSession((current) => current && current.user.id === data.user.id ? { ...current, user: data.user } : current);
  }, []);

  const value = useMemo<AuthValue>(() => {
    const user = session?.user ?? null;
    const rawRole = user?.user_metadata?.role;
    const role: AppRole | null =
      rawRole === 'client' || rawRole === 'coach' || rawRole === 'admin' ? rawRole : null;
    return {
      user,
      session,
      loading,
      role,
      passwordRecoveryPending,
      setPasswordRecoveryPending,
      signOut,
      retryRole,
    };
  }, [session, loading, passwordRecoveryPending, setPasswordRecoveryPending, signOut, retryRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
