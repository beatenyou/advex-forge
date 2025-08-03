import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface SimpleAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  authError: string | null;
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

export function SimpleAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAllStorage = () => {
    // Clear localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear sessionStorage
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        sessionStorage.removeItem(key);
      }
    });
  };

  useEffect(() => {
    console.log('🔐 Simple Auth: Initializing...');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 Simple Auth state change:', event, session?.user?.id);
        
        setSession(session);
        setUser(session?.user ?? null);
        setAuthError(null);
        setLoading(false);
        
        if (event === 'SIGNED_OUT') {
          console.log('👋 Simple Auth: User signed out');
          setSession(null);
          setUser(null);
          setAuthError(null);
        }
      }
    );

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔄 Simple Auth: Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Simple Auth: Initial session error:', error);
          setAuthError('Could not load session');
          setLoading(false);
          return;
        }
        
        console.log('🔐 Simple Auth: Initial session loaded:', session?.user?.id ? 'authenticated' : 'not authenticated');
      } catch (error) {
        console.error('❌ Simple Auth: Session loading failed:', error);
        setAuthError('Failed to connect to authentication service');
        setLoading(false);
      }
    };

    getInitialSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      console.log('🔐 Simple Auth: Signing out...');
      
      // Clear local state first
      setSession(null);
      setUser(null);
      setAuthError(null);
      setLoading(false);
      
      // Clear storage
      clearAllStorage();
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      console.log('👋 Simple Auth: Sign out complete');
    } catch (error) {
      console.error('Simple Auth: Sign out error:', error);
      // If signOut fails, clear everything anyway
      clearAllStorage();
      window.location.href = '/auth';
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    authError,
  };

  return <SimpleAuthContext.Provider value={value}>{children}</SimpleAuthContext.Provider>;
}

export function useSimpleAuth() {
  const context = useContext(SimpleAuthContext);
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider');
  }
  return context;
}