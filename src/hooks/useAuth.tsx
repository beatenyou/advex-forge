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
  isStuck: boolean;
  forceRestore: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isStuck, setIsStuck] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

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

  const ensureProfileExists = async (user: User) => {
    try {
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log('🔧 Creating missing profile for user:', user.id);
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            email: user.email,
            display_name: user.email?.split('@')[0] || 'User'
          });

        if (insertError) {
          console.error('Failed to create profile:', insertError);
        } else {
          console.log('✅ Profile created successfully');
        }
      }
    } catch (error) {
      console.error('Error ensuring profile exists:', error);
    }
  };

  const forceRestore = async () => {
    console.log('🔧 FORCE RESTORE: Attempting to restore authentication');
    setDebugMode(true);
    setIsStuck(false);
    setAuthError(null);
    
    try {
      // Try to get fresh session
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('🔧 Force restore session check:', { session: !!session, error });
      
      if (session) {
        setSession(session);
        setUser(session.user);
        setLoading(false);
        console.log('🔧 Force restore successful');
        
        // Create profile if missing
        await ensureProfileExists(session.user);
        return;
      }
      
      // If no session, clear everything and go to auth
      setSession(null);
      setUser(null);
      setLoading(false);
      window.location.href = '/auth';
    } catch (error) {
      console.error('🔧 Force restore failed:', error);
      setAuthError('Restore failed - redirecting to login');
      setTimeout(() => window.location.href = '/auth', 2000);
    }
  };

  const nuclearReset = async () => {
    console.log('🚨 NUCLEAR RESET: Clearing all auth data');
    
    // Clear browser storage first
    clearAllStorage();
    
    // Reset local state
    setSession(null);
    setUser(null);
    setAuthError(null);
    setLoading(false);
    setIsStuck(false);
    
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Nuclear reset error (non-critical):', error);
    }
    
    // Force redirect to prevent any cached state
    window.location.href = '/auth';
  };

  useEffect(() => {
    console.log('🔐 Initializing auth...');
    let authInitialized = false;
    
    // Track stuck state - reduced from 10s to 8s for faster feedback
    const stuckTimeout = setTimeout(() => {
      if (!authInitialized) {
        console.warn('⚠️ Auth appears stuck - enabling debug mode');
        setIsStuck(true);
        setLoading(false);
        setAuthError('Authentication is taking longer than expected');
      }
    }, 8000); // 8 seconds

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`🔐 [${debugMode ? 'DEBUG' : 'NORMAL'}] Auth state change:`, event, session?.user?.id);
        
        authInitialized = true;
        clearTimeout(stuckTimeout);
        setIsStuck(false);
        
        // Defer profile creation to prevent blocking auth flow
        if (session?.user) {
          setTimeout(() => ensureProfileExists(session.user), 100);
        }
        
        // Only update state synchronously - NO async operations here
        setSession(session);
        setUser(session?.user ?? null);
        setAuthError(null);
        setLoading(false);
        
        // Handle specific auth events
        if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out');
          setSession(null);
          setUser(null);
          setAuthError(null);
        }
        
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.warn('⚠️ Token refresh failed');
          setAuthError('Session expired - please sign in again');
        }
      }
    );

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔄 Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Initial session error:', error);
          setAuthError('Could not load session');
          setLoading(false);
          authInitialized = true;
          clearTimeout(stuckTimeout);
          return;
        }
        
        console.log('🔐 Initial session check:', session?.user?.id ? 'authenticated' : 'not authenticated');
        
        // Don't set state here - let onAuthStateChange handle it
        // This prevents race conditions between getSession and onAuthStateChange
        authInitialized = true;
        clearTimeout(stuckTimeout);
      } catch (error) {
        console.error('❌ Session loading failed:', error);
        setAuthError('Failed to connect to authentication service');
        setLoading(false);
        authInitialized = true;
        clearTimeout(stuckTimeout);
      }
    };

    getInitialSession();

    return () => {
      subscription.unsubscribe();
      clearTimeout(stuckTimeout);
    };
  }, [debugMode]);

  const signOut = async () => {
    try {
      console.log('🔐 Signing out...');
      
      // Clear local state first
      setSession(null);
      setUser(null);
      setAuthError(null);
      setLoading(false);
      setIsStuck(false);
      
      // Clear storage
      clearAllStorage();
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      console.log('👋 Sign out complete');
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
    isStuck,
    forceRestore,
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