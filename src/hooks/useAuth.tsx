import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Simple auth context types
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  console.log('[AUTH_PROVIDER] Component render');

  const signOut = useCallback(async () => {
    try {
      console.log('[AUTH] Signing out');
      await supabase.auth.signOut();
    } catch (error) {
      console.error('[AUTH] Sign out error:', error);
    }
  }, []);

  // Single effect for auth management
  useEffect(() => {
    console.log('[AUTH] Setting up auth listener');
    
    // Auth state change handler
    const handleAuthChange = (event: string, session: Session | null) => {
      console.log(`[AUTH] ${event}:`, session?.user?.email || 'No user');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AUTH] Initial session check');
      handleAuthChange('INITIAL_SESSION', session);
    });

    return () => {
      console.log('[AUTH] Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    signOut,
  }), [user, session, loading, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}