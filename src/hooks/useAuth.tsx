import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  clearAuthState: () => void;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isResolved = false;

    // Emergency timeout - force resolve after 3 seconds
    const emergencyTimeout = setTimeout(() => {
      if (!isResolved) {
        console.warn('Auth state taking too long, forcing resolution');
        setAuthError('Authentication taking longer than expected');
        setLoading(false);
        isResolved = true;
      }
    }, 3000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        
        if (!isResolved) {
          setSession(session);
          setUser(session?.user ?? null);
          setAuthError(null);
          setLoading(false);
          isResolved = true;
          clearTimeout(emergencyTimeout);
        }
        
        // Handle session validation
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.warn('Token refresh failed, clearing auth state');
          clearAuthState();
          return;
        }
        
        // Defer database operations to prevent infinite loops
        if (session?.user && event === 'SIGNED_IN') {
          setTimeout(async () => {
            try {
              // Clean up any stale sessions first
              await supabase.rpc('force_clean_user_auth', { 
                target_user_id: session.user.id 
              });
              
              await supabase.from('user_activity_log').insert({
                user_id: session.user.id,
                activity_type: 'sign_in',
                description: 'User signed in',
                user_agent: navigator.userAgent,
              });
            } catch (error) {
              console.error('Error logging sign in activity:', error);
            }
          }, 100);
        } else if (event === 'SIGNED_OUT') {
          // Store previous user ID before state changes
          const previousUserId = user?.id;
          setTimeout(async () => {
            if (previousUserId) {
              try {
                await supabase.from('user_activity_log').insert({
                  user_id: previousUserId,
                  activity_type: 'sign_out',
                  description: 'User signed out',
                  user_agent: navigator.userAgent,
                });
              } catch (error) {
                console.error('Error logging sign out activity:', error);
              }
            }
          }, 100);
        }
      }
    );

    // THEN check for existing session with validation
    const validateSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session validation error:', error);
          setAuthError(error.message);
          clearAuthState();
          return;
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
        console.error('Session check failed:', error);
        if (!isResolved) {
          setAuthError('Failed to validate session');
          setLoading(false);
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
  }, []); // Remove problematic dependency that was causing infinite loop

  const clearAuthState = () => {
    // Clear all auth-related localStorage
    localStorage.removeItem('sb-csknxtzjfdqoaoforrfm-auth-token');
    localStorage.removeItem('supabase.auth.token');
    
    // Clear all localStorage items that start with 'sb-'
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    setSession(null);
    setUser(null);
    setAuthError(null);
    setLoading(false);
  };

  const signOut = async () => {
    // Log the sign out activity before signing out
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
    
    // Clear local state and storage
    clearAuthState();
    
    // Then sign out from Supabase
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if signOut fails, we've cleared local state
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    clearAuthState,
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