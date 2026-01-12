import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  viewedUserId: string | null;
  setViewedUserId: (id: string | null) => void;
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

  const setViewedUserId = (id: string | null) => {
    setViewedUserIdState(id);
    if (id) {
      sessionStorage.setItem('dawnage_viewed_user_id', id);
    } else {
      sessionStorage.removeItem('dawnage_viewed_user_id');
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      // Always clear local state even if the server request fails (e.g. 403 Forbidden)
      setUser(null);
      setSession(null);
      setViewedUserId(null); // This will also clear sessionStorage
    }
  };

  const isCoachView = !!viewedUserId;

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, viewedUserId, setViewedUserId, isCoachView }}>
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
