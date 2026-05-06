import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../supabase/client';

interface AuthContextValue {
  session: Session | null;
  isConfigured: boolean;
  hasLoadedSession: boolean;
  signInWithOtp: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const noop = async () => {};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  isConfigured: false,
  hasLoadedSession: true,
  signInWithOtp: noop,
  signOut: noop,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [hasLoadedSession, setHasLoadedSession] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) {
      setHasLoadedSession(true);
      return;
    }

    let isMounted = true;

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (isMounted) {
          setSession(data.session ?? null);
          setHasLoadedSession(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSession(null);
          setHasLoadedSession(true);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setHasLoadedSession(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    session,
    isConfigured: isSupabaseConfigured,
    hasLoadedSession,
    signInWithOtp: async (email: string) => {
      if (!supabase) {
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) {
        throw error;
      }
    },
    signOut: async () => {
      if (!supabase) {
        return;
      }

      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
