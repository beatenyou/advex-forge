import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { customStorage } from '@/lib/customStorage';

// Types for our auth system
interface UserProfile {
  user_id: string;
  email: string;
  display_name: string;
  role: string;
  permissions: string[];
  subscription_status: string;
  is_pro: boolean;
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
  
  // Use refs to prevent re-renders from causing auth loops
  const processingAuth = useRef(false);
  const authSubscription = useRef<{ unsubscribe: () => void } | null>(null);
  const mounted = useRef(true);

  console.log('[AUTH_PROVIDER] Component render');

  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .rpc('get_complete_user_profile', { target_user_id: userId });

      if (error) {
        console.error('[AUTH] Profile fetch error:', error);
        return null;
      }

      if (data && data.length > 0) {
        return data[0];
      }

      return null;
    } catch (error) {
      console.error('[AUTH] Profile fetch exception:', error);
      return null;
    }
  };

  const ensureProfileExists = async (user: User): Promise<void> => {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          email: user.email || '',
          display_name: user.email?.split('@')[0] || 'User',
          role: 'user',
          permissions: ['user'],
          is_pro: false,
          subscription_status: 'free'
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('[AUTH] Error ensuring profile exists:', error);
      }
    } catch (error) {
      console.error('[AUTH] Exception ensuring profile exists:', error);
    }
  };

  const recoverSession = async (): Promise<boolean> => {
    try {
      setIsRecovering(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('[AUTH] Session recovery error:', error);
      return false;
    } finally {
      setIsRecovering(false);
    }
  };

  const emergencyAdminAccess = async (): Promise<boolean> => {
    try {
      const hash = window.location.hash;
      if (hash.includes('emergency_admin=true')) {
        console.log('[AUTH] Emergency admin access attempted');
        window.location.hash = '';
        return await recoverSession();
      }
    } catch (error) {
      console.error('[AUTH] Emergency access error:', error);
    }
    return false;
  };

  const clearAuthState = useCallback(() => {
    console.log('[AUTH] Clearing auth state');
    setUser(null);
    setSession(null);
    setProfile(null);
    setAuthError(null);
  }, []);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[AUTH] Signing out user');
      await supabase.auth.signOut();
      clearAuthState();
    } catch (error) {
      console.error('[AUTH] Sign out error:', error);
      clearAuthState();
    } finally {
      setLoading(false);
    }
  }, [clearAuthState]);

  // Single auth initialization effect
  useEffect(() => {
    if (processingAuth.current) {
      console.log('[AUTH] Already processing, skipping...');
      return;
    }

    console.log('[AUTH] Starting authentication initialization...');
    processingAuth.current = true;

    const handleAuthChange = async (event: string, session: Session | null) => {
      if (!mounted.current) return;
      
      console.log(`[AUTH] ${event}:`, session?.user?.email || 'No user', {
        hasSession: !!session,
        hasUser: !!session?.user
      });

      try {
        // Update core auth state
        setSession(session);
        setUser(session?.user || null);
        setAuthError(null);

        if (session?.user) {
          // Ensure profile exists and fetch it
          await ensureProfileExists(session.user);
          const userProfile = await fetchUserProfile(session.user.id);
          
          if (mounted.current) {
            if (userProfile) {
              setProfile(userProfile);
              console.log('[AUTH] Profile loaded successfully');
            } else {
              // Create fallback profile
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
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('[AUTH] Error in auth change handler:', error);
        if (mounted.current) {
          setAuthError('Authentication error occurred');
        }
      } finally {
        if (mounted.current) {
          setLoading(false);
        }
      }
    };

    const initAuth = async () => {
      try {
        // Set up auth listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);
        authSubscription.current = subscription;

        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AUTH] Session error:', error);
          if (mounted.current) {
            setAuthError(`Session error: ${error.message}`);
            setLoading(false);
          }
          return;
        }

        // Process initial session
        await handleAuthChange('INITIAL_SESSION', session);
        
      } catch (error) {
        console.error('[AUTH] Auth initialization error:', error);
        if (mounted.current) {
          setAuthError('Failed to initialize authentication');
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      console.log('[AUTH] Cleaning up auth effect...');
      mounted.current = false;
      if (authSubscription.current) {
        authSubscription.current.unsubscribe();
        authSubscription.current = null;
      }
    };
  }, []); // Only run once

  // Update mounted ref when component unmounts
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const isStorageRestricted = customStorage.isUsingMemoryStorage();

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user,
    session,
    profile,
    loading,
    signOut,
    isAdmin: profile?.role === 'admin',
    isProUser: profile?.is_pro || profile?.role === 'admin',
    hasPermission: (permission: string): boolean => {
      return profile?.permissions?.includes(permission) || false;
    },
    authError,
    isRecovering,
    recoverSession,
    emergencyAdminAccess,
    isStorageRestricted,
  }), [user, session, profile, loading, authError, isRecovering, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}