import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, clearCorruptAuthData } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  viewedUserId: string | null;
  setViewedUserId: (id: string | null) => void;
  viewedCoachId: string | null;
  setViewedCoachId: (id: string | null) => void;
  isCoachView: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Initialize from session storage if available
  const [viewedUserId, setViewedUserIdState] = useState<string | null>(() => {
    return sessionStorage.getItem('dawnage_viewed_user_id');
  });
  const [viewedCoachId, setViewedCoachIdState] = useState<string | null>(() => {
    return sessionStorage.getItem('dawnage_viewed_coach_id');
  });

  const setViewedUserId = useCallback((id: string | null) => {
    setViewedUserIdState(id);
    if (id) {
      sessionStorage.setItem('dawnage_viewed_user_id', id);
    } else {
      sessionStorage.removeItem('dawnage_viewed_user_id');
    }
  }, []);

  const setViewedCoachId = useCallback((id: string | null) => {
    setViewedCoachIdState(id);
    if (id) {
      sessionStorage.setItem('dawnage_viewed_coach_id', id);
    } else {
      sessionStorage.removeItem('dawnage_viewed_coach_id');
    }
  }, []);

  useEffect(() => {
    // Get initial session with error recovery for corrupt tokens
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.warn('Session recovery failed, clearing corrupt auth data:', error.message);
          clearCorruptAuthData();
          setSession(null);
          setUser(null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.warn('Failed to get session, clearing auth data:', error);
        clearCorruptAuthData();
        setSession(null);
        setUser(null);
        setLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      }
      if (event === 'SIGNED_OUT') {
        // Ensure corrupt data is cleared on sign out
        clearCorruptAuthData();
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      clearCorruptAuthData();
      setUser(null);
      setSession(null);
      setViewedUserId(null);
      setViewedCoachId(null);
    }
  }, [setViewedUserId, setViewedCoachId]);

  const isCoachView = !!viewedUserId;

  const contextValue = useMemo(() => ({
    user, session, loading, signOut, viewedUserId, setViewedUserId, viewedCoachId, setViewedCoachId, isCoachView,
  }), [user, session, loading, signOut, viewedUserId, setViewedUserId, viewedCoachId, setViewedCoachId, isCoachView]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
