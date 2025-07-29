import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Track authentication events
        if (session?.user && event === 'SIGNED_IN') {
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
        } else if (event === 'SIGNED_OUT') {
          try {
            // Use the previous user ID if available
            const userId = user?.id;
            if (userId) {
              await supabase.from('user_activity_log').insert({
                user_id: userId,
                activity_type: 'sign_out',
                description: 'User signed out',
                user_agent: navigator.userAgent,
              });
            }
          } catch (error) {
            console.error('Error logging sign out activity:', error);
          }
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [user?.id]);

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

  const value = {
    user,
    session,
    loading,
    signOut,
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