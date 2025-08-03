import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  retry: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let authResolved = false;
    
    console.log('AuthProvider: Starting initialization');
    
    // Shorter timeout for emergency bypass
    const emergencyTimeout = setTimeout(() => {
      if (mounted && !authResolved) {
        console.warn('AuthProvider: Emergency timeout triggered - forcing resolution');
        setLoading(false);
        setError('Authentication took too long. You can try logging in manually or continue without authentication.');
      }
    }, 5000); // 5 second emergency timeout

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log('AuthProvider: Auth state change:', event, 'Session exists:', !!session, 'User ID:', session?.user?.id);
        authResolved = true;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        setError(null);
        
        // Clear timeout since auth resolved
        clearTimeout(emergencyTimeout);
        
        // Defer database operations to prevent infinite loops
        if (session?.user && event === 'SIGNED_IN') {
          setTimeout(async () => {
            try {
              await supabase.from('user_activity_log').insert({
                user_id: session.user.id,
                activity_type: 'sign_in',
                description: 'User signed in',
                user_agent: navigator.userAgent,
              });
            } catch (error) {
              console.error('Error logging sign in activity:', error);
            }
          }, 0);
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
          }, 0);
        }
      }
    );

    // THEN check for existing session with multiple attempts
    const checkSession = async () => {
      try {
        console.log('AuthProvider: Checking existing session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('AuthProvider: Error getting session:', error);
          setError(`Session error: ${error.message}`);
        } else {
          console.log('AuthProvider: Session check complete:', !!session, session?.user?.id);
        }
        
        authResolved = true;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Clear timeout since we got a response
        clearTimeout(emergencyTimeout);
      } catch (err) {
        if (!mounted) return;
        
        console.error('AuthProvider: Failed to get session:', err);
        authResolved = true;
        setError('Failed to initialize authentication');
        setLoading(false);
        clearTimeout(emergencyTimeout);
      }
    };

    // Try to get session immediately
    checkSession();

    return () => {
      console.log('AuthProvider: Cleanup called');
      mounted = false;
      clearTimeout(emergencyTimeout);
      subscription.unsubscribe();
    };
  }, []); // Remove problematic dependency that was causing infinite loop

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
    await supabase.auth.signOut();
  };

  const retry = () => {
    console.log('AuthProvider: Manual retry triggered');
    setLoading(true);
    setError(null);
    
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('AuthProvider: Retry result:', !!session, error?.message);
      if (error) {
        setError(`Retry failed: ${error.message}`);
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((err) => {
      console.error('AuthProvider: Retry error:', err);
      setError('Retry failed - please try signing in manually');
      setLoading(false);
    });
  };

  const value = {
    user,
    session,
    loading,
    error,
    signOut,
    retry,
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