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

  const fetchUserProfile = async (userId: string, retryCount = 0): Promise<UserProfile | null> => {
    try {
      console.log(`[AUTH] Fetching profile for user: ${userId} (attempt ${retryCount + 1})`);
      
      const { data, error } = await supabase.rpc('get_complete_user_profile', {
        target_user_id: userId
      });

      if (error) {
        console.error('[AUTH] Error fetching user profile:', error);
        
        // Retry up to 2 times for network errors
        if (retryCount < 2 && (error.message?.includes('network') || error.message?.includes('timeout'))) {
          console.log(`[AUTH] Retrying profile fetch (${retryCount + 1}/2)`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return fetchUserProfile(userId, retryCount + 1);
        }
        
        return null;
      }

      const profile = data?.[0] || null;
      
      if (profile) {
        console.log(`[AUTH] Profile loaded:`, {
          email: profile.email,
          role: profile.role,
          permissions: profile.permissions,
          isAdmin: profile.role === 'admin'
        });
      } else {
        console.warn('[AUTH] No profile data returned from get_complete_user_profile');
      }

      return profile;
    } catch (error) {
      console.error('[AUTH] Exception fetching user profile:', error);
      return null;
    }
  };

  const ensureProfileExists = async (user: User) => {
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id, role')
        .eq('user_id', user.id)
        .single();

      if (!existingProfile) {
        console.log('[AUTH] Creating profile for user:', user.id);
        // Check if this is an admin user by email
        const isAdmin = user.email === 'beatenyouog@gmail.com';
        
        const { error } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            email: user.email,
            display_name: user.email?.split('@')[0] || 'User',
            role: isAdmin ? 'admin' : 'user',
            subscription_status: 'free',
            is_pro: isAdmin,
            permissions: isAdmin ? ['admin', 'user', 'pro'] : ['user']
          });

        if (error) {
          console.error('[AUTH] Failed to create profile:', error);
        }
      }
    } catch (error) {
      console.error('[AUTH] Error ensuring profile exists:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const handleAuthChange = async (event: string, session: Session | null) => {
      console.log(`[AUTH] ${event}:`, session?.user?.email || 'No user');

      if (!mounted) return;

      if (session?.user) {
        console.log('[AUTH] Valid session found, processing user...');
        setUser(session.user);
        setSession(session);
        
        try {
          // Ensure profile exists first
          await ensureProfileExists(session.user);
          
          // Then fetch complete profile data with validation
          const userProfile = await fetchUserProfile(session.user.id);
          
          if (mounted) {
            if (userProfile) {
              // Validate profile has required data
              if (!userProfile.permissions || userProfile.permissions.length === 0) {
                console.warn('[AUTH] Profile missing permissions, fixing...');
                
                // For admin users, ensure they have proper permissions
                if (userProfile.role === 'admin' || session.user.email === 'beatenyouog@gmail.com') {
                  userProfile.permissions = ['admin', 'user', 'pro'];
                  userProfile.is_pro = true;
                  
                  // Update the database to fix this permanently
                  await supabase
                    .from('profiles')
                    .update({ 
                      permissions: ['admin', 'user', 'pro'], 
                      is_pro: true,
                      role: 'admin' 
                    })
                    .eq('user_id', session.user.id);
                }
              }
              
              setProfile(userProfile);
              console.log('[AUTH] Profile successfully set with permissions:', userProfile.permissions);
            } else {
              console.error('[AUTH] Failed to load user profile');
              setProfile(null);
            }
          }
        } catch (error) {
          console.error('[AUTH] Error in auth change handler:', error);
          if (mounted) {
            setProfile(null);
          }
        }
      } else {
        console.log('[AUTH] No session, clearing auth state');
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

  const clearAuthState = () => {
    console.log('[AUTH] Clearing auth state and browser storage');
    setUser(null);
    setSession(null);
    setProfile(null);
    
    // Clear any cached auth data
    localStorage.removeItem('supabase.auth.token');
    sessionStorage.clear();
  };

  const signOut = async () => {
    try {
      setLoading(true);
      console.log('[AUTH] Signing out user');
      await supabase.auth.signOut();
      clearAuthState();
    } catch (error) {
      console.error('[AUTH] Sign out error:', error);
      // Clear state even if signOut fails
      clearAuthState();
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