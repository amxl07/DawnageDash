import type { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

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
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecoveryPending, setRecoveryState] = useState(false);

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
    const stopAutoRefresh = startAuthAutoRefresh();

    // An interrupted recovery must resume on next launch rather than dropping
    // the user into the app with a password they never finished changing.
    AsyncStorage.getItem(RECOVERY_KEY)
      .then((v) => active && v === '1' && setRecoveryState(true))
      .catch(() => {});

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error && isInvalidRefreshTokenError(error)) {
          clearCorruptAuthData().then(() => active && setSession(null));
        } else {
          setSession(data.session);
        }
      })
      .catch(async (error) => {
        if (isInvalidRefreshTokenError(error)) await clearCorruptAuthData();
        if (active) setSession(null);
      })
      .finally(() => active && setLoading(false));

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      setSession(next);
      setLoading(false);
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
    setPasswordRecoveryPending(false);
    try {
      await supabase.auth.signOut();
    } finally {
      // Even if the network call fails, drop local state so the user is not
      // trapped in a session they asked to leave.
      await clearCorruptAuthData();
      setSession(null);
    }
  }, [setPasswordRecoveryPending]);

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
    };
  }, [session, loading, passwordRecoveryPending, setPasswordRecoveryPending, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
