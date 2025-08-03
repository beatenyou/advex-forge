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
  authInitialized: boolean;
  redirecting: boolean;
  redirectCount: number;
  debugInfo: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isStuck, setIsStuck] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [redirectCount, setRedirectCount] = useState(() => {
    const stored = localStorage.getItem('auth_redirect_count');
    return stored ? parseInt(stored, 10) : 0;
  });
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebugInfo = (info: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const message = `${timestamp}: ${info}`;
    setDebugInfo(prev => [...prev.slice(-9), message]);
    console.log(`[AUTH DEBUG] ${message}`);
  };

  const incrementRedirectCount = () => {
    setRedirectCount(prev => {
      const newCount = prev + 1;
      localStorage.setItem('auth_redirect_count', newCount.toString());
      addDebugInfo(`Redirect attempt #${newCount}`);
      return newCount;
    });
  };

  const resetRedirectCount = () => {
    setRedirectCount(0);
    localStorage.removeItem('auth_redirect_count');
    addDebugInfo('Redirect count reset');
  };

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
    addDebugInfo('Force restore initiated');
    setIsStuck(false);
    setAuthError(null);
    setRedirecting(false);
    resetRedirectCount();
    
    try {
      // Try to get fresh session
      const { data: { session }, error } = await supabase.auth.getSession();
      addDebugInfo(`Force restore session check: ${session ? 'found' : 'none'}, error: ${error?.message || 'none'}`);
      
      if (session) {
        setSession(session);
        setUser(session.user);
        setAuthInitialized(true);
        setLoading(false);
        addDebugInfo('Force restore successful');
        
        // Create profile if missing
        await ensureProfileExists(session.user);
        return;
      }
      
      // If no session, clear everything and go to auth
      setSession(null);
      setUser(null);
      setAuthInitialized(true);
      setLoading(false);
      addDebugInfo('Force restore: no session, redirecting to auth');
      setRedirecting(true);
      setTimeout(() => {
        window.location.href = '/auth';
      }, 1000);
    } catch (error) {
      addDebugInfo(`Force restore failed: ${error}`);
      setAuthError('Restore failed - redirecting to login');
      setTimeout(() => window.location.href = '/auth', 2000);
    }
  };

  const nuclearReset = async () => {
    addDebugInfo('Nuclear reset initiated');
    
    // Clear browser storage first
    clearAllStorage();
    resetRedirectCount();
    
    // Reset local state
    setSession(null);
    setUser(null);
    setAuthError(null);
    setLoading(false);
    setIsStuck(false);
    setAuthInitialized(true);
    setRedirecting(false);
    
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
    } catch (error) {
      addDebugInfo(`Nuclear reset error (non-critical): ${error}`);
    }
    
    // Force redirect to prevent any cached state
    addDebugInfo('Redirecting to auth after nuclear reset');
    window.location.href = '/auth';
  };

  useEffect(() => {
    addDebugInfo('Initializing auth system');
    
    // Check for existing redirect loop
    if (redirectCount >= 3) {
      addDebugInfo(`Circuit breaker activated - redirect count: ${redirectCount}`);
      setIsStuck(true);
      setLoading(false);
      setAuthInitialized(true);
      return;
    }
    
    let localAuthInitialized = false;
    
    // Track stuck state - reduced to 5s for faster feedback
    const stuckTimeout = setTimeout(() => {
      if (!localAuthInitialized) {
        addDebugInfo('Auth timeout reached - appears stuck');
        setIsStuck(true);
        setLoading(false);
        setAuthInitialized(true);
      }
    }, 5000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        addDebugInfo(`Auth state change: ${event}, session: ${session ? 'exists' : 'null'}`);
        
        localAuthInitialized = true;
        setAuthInitialized(true);
        clearTimeout(stuckTimeout);
        setIsStuck(false);
        setRedirecting(false);
        
        if (session?.user) {
          resetRedirectCount();
          // Defer profile creation to prevent blocking auth flow
          setTimeout(() => ensureProfileExists(session.user), 100);
        }
        
        // Only update state synchronously - NO async operations here
        setSession(session);
        setUser(session?.user ?? null);
        setAuthError(null);
        setLoading(false);
        
        // Handle specific auth events
        if (event === 'SIGNED_OUT') {
          addDebugInfo('User signed out');
          setSession(null);
          setUser(null);
          setAuthError(null);
        }
        
        if (event === 'TOKEN_REFRESHED' && !session) {
          addDebugInfo('Token refresh failed');
          setAuthError('Session expired - please sign in again');
        }
      }
    );

    // Get initial session
    const getInitialSession = async () => {
      try {
        addDebugInfo('Getting initial session');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          addDebugInfo(`Initial session error: ${error.message}`);
          setAuthError('Could not load session');
          setLoading(false);
          setAuthInitialized(true);
          localAuthInitialized = true;
          clearTimeout(stuckTimeout);
          return;
        }
        
        addDebugInfo(`Initial session: ${session?.user?.id ? 'authenticated' : 'not authenticated'}`);
        
        // Don't set state here - let onAuthStateChange handle it
        // This prevents race conditions between getSession and onAuthStateChange
        localAuthInitialized = true;
        setAuthInitialized(true);
        clearTimeout(stuckTimeout);
      } catch (error) {
        addDebugInfo(`Session loading failed: ${error}`);
        setAuthError('Failed to connect to authentication service');
        setLoading(false);
        setAuthInitialized(true);
        localAuthInitialized = true;
        clearTimeout(stuckTimeout);
      }
    };

    getInitialSession();

    return () => {
      subscription.unsubscribe();
      clearTimeout(stuckTimeout);
    };
  }, [redirectCount]);

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
    authInitialized,
    redirecting,
    redirectCount,
    debugInfo,
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