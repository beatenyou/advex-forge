import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  nuclearReset: () => Promise<void>;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
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
    
    // Clear specific auth keys
    const authKeys = [
      'sb-csknxtzjfdqoaoforrfm-auth-token',
      'supabase.auth.token',
      'sb-localhost-auth-token',
    ];
    
    authKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  };

  const nuclearReset = async () => {
    console.log('🚨 NUCLEAR RESET: Clearing all auth data');
    
    // Log the nuclear reset event for enhanced monitoring
    if (user?.id) {
      try {
        await supabase.from('auth_events').insert({
          user_id: user.id,
          event_type: 'nuclear_reset_initiated',
          event_data: {
            reason: 'User initiated nuclear reset',
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          },
          severity: 'warning'
        });
      } catch (error) {
        console.error('Failed to log nuclear reset event:', error);
      }
    }
    
    // Clear browser storage first
    clearAllStorage();
    
    // Reset local state
    setSession(null);
    setUser(null);
    setAuthError(null);
    setLoading(false);
    
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clean database sessions if user exists
      if (user?.id) {
        await supabase.rpc('nuclear_auth_reset', { target_user_id: user.id });
      }
    } catch (error) {
      console.error('Nuclear reset error (non-critical):', error);
    }
    
    // Force redirect to prevent any cached state
    window.location.href = '/auth';
  };

  useEffect(() => {
    let isResolved = false;
    let timeoutId: NodeJS.Timeout;

    // Emergency timeout - force resolution after 2 seconds
    const emergencyTimeout = setTimeout(() => {
      if (!isResolved) {
        console.warn('🚨 Auth taking too long, forcing resolution');
        setAuthError('Authentication timeout - please try nuclear reset');
        setLoading(false);
        isResolved = true;
      }
    }, 2000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state change:', event, session?.user?.id);
        
        if (!isResolved) {
          setSession(session);
          setUser(session?.user ?? null);
          setAuthError(null);
          setLoading(false);
          isResolved = true;
          clearTimeout(emergencyTimeout);
        }
        
        // Handle specific auth events
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.warn('⚠️ Token refresh failed, triggering nuclear reset');
          await nuclearReset();
          return;
        }
        
        if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out');
          setSession(null);
          setUser(null);
          setAuthError(null);
        }
      }
    );

    // THEN check for existing session with validation
    const validateSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session validation error:', error);
          setAuthError('Session validation failed');
          await nuclearReset();
          return;
        }

        // Additional session validation
        if (session) {
          try {
            // Test if session is actually valid by making a simple request
            const { error: testError } = await supabase.from('profiles').select('user_id').limit(1);
            if (testError && testError.message.includes('JWT')) {
              console.warn('⚠️ Invalid session detected, clearing');
              await nuclearReset();
              return;
            }
          } catch (validationError) {
            console.warn('⚠️ Session validation failed, clearing');
            await nuclearReset();
            return;
          }
        }

        if (!isResolved) {
          setSession(session);
          setUser(session?.user ?? null);
          setAuthError(null);
          setLoading(false);
          isResolved = true;
          clearTimeout(emergencyTimeout);
        }
      } catch (error) {
        console.error('💥 Session check failed:', error);
        if (!isResolved) {
          setAuthError('Failed to validate session');
          await nuclearReset();
          isResolved = true;
          clearTimeout(emergencyTimeout);
        }
      }
    };

    validateSession();

    return () => {
      subscription.unsubscribe();
      clearTimeout(emergencyTimeout);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []); // No dependencies to prevent infinite loops

  const signOut = async () => {
    try {
      // Log sign out activity if user exists
      if (user) {
        try {
          await supabase.from('user_activity_log').insert({
            user_id: user.id,
            activity_type: 'sign_out_initiated',
            description: 'User initiated sign out',
            user_agent: navigator.userAgent,
          });
        } catch (error) {
          console.error('Error logging sign out activity:', error);
        }
      }
      
      // Clear local state first
      setSession(null);
      setUser(null);
      setAuthError(null);
      setLoading(false);
      
      // Clear storage
      clearAllStorage();
      
      // Sign out from Supabase
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      // If signOut fails, force nuclear reset
      await nuclearReset();
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    nuclearReset,
    authError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}