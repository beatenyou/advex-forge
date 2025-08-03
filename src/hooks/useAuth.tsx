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
    
    console.log('AuthProvider: Starting initialization');
    
    // Absolute emergency timeout - force resolution after 3 seconds NO MATTER WHAT
    const emergencyTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('AuthProvider: EMERGENCY TIMEOUT - Force resolving auth state');
        setLoading(false);
        setError('Authentication system is temporarily unavailable. You can continue using the app.');
      }
    }, 3000); // 3 second absolute timeout

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log('AuthProvider: Auth state change:', event, 'Session exists:', !!session, 'User ID:', session?.user?.id);
        
        // FORCE RESOLUTION - no more hanging
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        setError(null);
        
        // Clear timeout since auth resolved
        clearTimeout(emergencyTimeout);
        
        // Skip activity logging to prevent issues
      }
    );

    // Simple session check with timeout
    const checkSession = async () => {
      try {
        console.log('AuthProvider: Checking existing session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('AuthProvider: Error getting session:', error);
        }
        
        console.log('AuthProvider: Session check complete:', !!session, session?.user?.id);
        
        // FORCE RESOLUTION - no more hanging
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        setError(null);
        
        clearTimeout(emergencyTimeout);
      } catch (err) {
        if (!mounted) return;
        
        console.error('AuthProvider: Failed to get session:', err);
        setLoading(false);
        setError('Authentication temporarily unavailable');
        clearTimeout(emergencyTimeout);
      }
    };

    // Immediate session check
    checkSession();

    return () => {
      console.log('AuthProvider: Cleanup called');
      mounted = false;
      clearTimeout(emergencyTimeout);
      subscription.unsubscribe();
    };
  }, []);

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