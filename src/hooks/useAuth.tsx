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
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
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

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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