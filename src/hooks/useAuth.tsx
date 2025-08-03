import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: string;
  subscription_status: string;
  is_pro: boolean;
  permissions: string[];
  ai_usage_current: number;
  ai_quota_limit: number;
  plan_name: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isProUser: boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_complete_user_profile', {
        target_user_id: userId
      });

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  const ensureProfileExists = async (user: User) => {
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

      if (!existingProfile) {
        console.log('Creating profile for user:', user.id);
        const { error } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            email: user.email,
            display_name: user.email?.split('@')[0] || 'User',
            role: 'user',
            subscription_status: 'free',
            is_pro: false,
            permissions: ['user']
          });

        if (error) {
          console.error('Failed to create profile:', error);
        }
      }
    } catch (error) {
      console.error('Error ensuring profile exists:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const handleAuthChange = async (event: string, session: Session | null) => {
      console.log(`[AUTH] ${event}:`, session?.user?.email || 'No user');

      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
        setSession(session);
        
        // Ensure profile exists first
        await ensureProfileExists(session.user);
        
        // Then fetch complete profile data
        const userProfile = await fetchUserProfile(session.user.id);
        if (mounted) {
          setProfile(userProfile);
        }
      } else {
        setUser(null);
        setSession(null);
        setProfile(null);
      }

      if (mounted) {
        setLoading(false);
      }
    };

    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        handleAuthChange('INITIAL_SESSION', session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = profile?.role === 'admin';
  const isProUser = profile?.is_pro || isAdmin;
  
  const hasPermission = (permission: string): boolean => {
    return profile?.permissions?.includes(permission) || false;
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signOut,
    isAdmin,
    isProUser,
    hasPermission,
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