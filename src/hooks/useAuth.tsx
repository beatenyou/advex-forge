import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { customStorage } from '@/lib/customStorage';

// Circuit breaker to prevent infinite auth loops
let authRetryCount = 0;
const MAX_AUTH_RETRIES = 3;
const RETRY_RESET_TIME = 60000; // 1 minute

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
  authError: string | null;
  isRecovering: boolean;
  recoverSession: () => Promise<boolean>;
  emergencyAdminAccess: () => Promise<boolean>;
  isStorageRestricted: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  console.log('[AUTH_PROVIDER] Component render');

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

  // Session recovery mechanism
  const recoverSession = async () => {
    if (isRecovering) return;
    
    console.log('[AUTH] Attempting session recovery...');
    setIsRecovering(true);
    
    try {
      // Clear any corrupted local storage
      localStorage.removeItem('supabase.auth.token');
      
      // Force refresh session
      const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('[AUTH] Session recovery failed:', error);
        setAuthError('Authentication session could not be recovered. Please sign in again.');
        await forceSignOut();
        return false;
      }
      
      if (refreshedSession) {
        console.log('[AUTH] Session recovered successfully');
        setAuthError(null);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[AUTH] Session recovery exception:', error);
      setAuthError('Session recovery failed. Please try signing in again.');
      return false;
    } finally {
      setIsRecovering(false);
    }
  };

  // Emergency admin bypass
  const emergencyAdminAccess = async () => {
    if (typeof window !== 'undefined' && window.location.hash === '#admin-emergency') {
      console.log('[AUTH] Emergency admin access triggered');
      try {
        const { data: adminProfile } = await supabase.rpc('get_complete_user_profile', {
          target_user_id: (await supabase.from('profiles').select('user_id').eq('email', 'beatenyouog@gmail.com').single()).data?.user_id
        });
          
        if (adminProfile?.[0]) {
          setProfile(adminProfile[0]);
          setAuthError(null);
          console.log('[AUTH] Emergency admin access granted');
          return true;
        }
      } catch (error) {
        console.error('[AUTH] Emergency admin access failed:', error);
      }
    }
    return false;
  };

  // Force sign out with cleanup
  const forceSignOut = async () => {
    console.log('[AUTH] Force sign out initiated');
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('[AUTH] Error during force sign out:', error);
    }
    clearAuthState();
  };

  useEffect(() => {
    console.log('[AUTH] Starting authentication initialization...');
    
    let mounted = true;
    let authSubscription: { unsubscribe: () => void } | null = null;
    
    const handleAuthChange = (event: string, session: Session | null) => {
      if (!mounted) {
        console.log('[AUTH] Component unmounted, ignoring auth change');
        return;
      }
      
      console.log(`[AUTH] ${event}:`, session?.user?.email || 'No user', {
        hasSession: !!session,
        hasUser: !!session?.user
      });

      // Always update core state first
      setSession(session);
      setUser(session?.user || null);
      setAuthError(null);
      
      // Handle user profile loading
      if (session?.user) {
        // Defer profile loading to prevent blocking the auth flow
        setTimeout(() => {
          if (mounted) {
            fetchUserProfile(session.user.id).then(profile => {
              if (mounted && profile) {
                setProfile(profile);
                console.log('[AUTH] Profile loaded successfully');
              }
            }).catch(error => {
              console.error('[AUTH] Profile fetch error:', error);
              if (mounted) {
                // Create a basic profile as fallback
                setProfile({
                  user_id: session.user.id,
                  email: session.user.email || '',
                  display_name: session.user.email?.split('@')[0] || 'User',
                  role: 'user',
                  permissions: ['user'],
                  subscription_status: 'free',
                  is_pro: false,
                  ai_usage_current: 0,
                  ai_quota_limit: 50,
                  plan_name: 'Free'
                });
              }
            });
          }
        }, 100);
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    };

    const initializeAuth = async () => {
      try {
        console.log('[AUTH] Setting up auth listener...');
        
        // Set up auth listener FIRST
        const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);
        authSubscription = subscription;
        
        console.log('[AUTH] Getting initial session...');
        
        // THEN get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AUTH] Session error:', error);
          if (mounted) {
            setAuthError(`Session error: ${error.message}`);
            setLoading(false);
          }
          return;
        }
        
        if (mounted) {
          handleAuthChange('INITIAL_SESSION', session);
        }
      } catch (error) {
        console.error('[AUTH] Auth initialization error:', error);
        if (mounted) {
          setAuthError('Failed to initialize authentication');
          setLoading(false);
        }
      }
    };
    
    initializeAuth();

    return () => {
      console.log('[AUTH] Cleaning up auth effect...');
      mounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []); // Empty deps - run only once

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

  const isStorageRestricted = customStorage.isUsingMemoryStorage();

  const value = {
    user,
    session,
    profile,
    loading,
    signOut,
    isAdmin,
    isProUser,
    hasPermission,
    authError,
    isRecovering,
    recoverSession,
    emergencyAdminAccess,
    isStorageRestricted,
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