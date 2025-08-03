import { useState, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AuthHealthMetrics {
  loginSuccessRate: number;
  avgSessionDuration: number;
  errorRate: number;
  lastCalculated: string;
}

interface SessionValidation {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
}

interface AuthEvent {
  id: string;
  eventType: string;
  eventData: any;
  severity: 'info' | 'warning' | 'error' | 'critical';
  createdAt: string;
}

export function useEnhancedAuth() {
  const { user, session, loading, authError } = useAuth();
  const [healthMetrics, setHealthMetrics] = useState<AuthHealthMetrics | null>(null);
  const [sessionValidation, setSessionValidation] = useState<SessionValidation | null>(null);
  const [authEvents, setAuthEvents] = useState<AuthEvent[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const sessionIdRef = useRef<string | null>(null);

  // Generate browser fingerprint for enhanced security
  const generateBrowserFingerprint = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Browser fingerprint', 2, 2);
    }
    
    const fingerprint = btoa(JSON.stringify({
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screen: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvas: canvas.toDataURL(),
      cookieEnabled: navigator.cookieEnabled,
      onlineStatus: navigator.onLine
    }));
    
    return fingerprint;
  };

  // Enhanced session activity logging
  const logSessionActivity = async (action: string, details?: any, success: boolean = true) => {
    if (!user || !session) return;

    try {
      const fingerprint = generateBrowserFingerprint();
      
      await supabase.rpc('log_session_activity', {
        p_user_id: user.id,
        p_session_id: sessionIdRef.current || session.access_token.substring(0, 8),
        p_action: action,
        p_details: details,
        p_user_agent: navigator.userAgent,
        p_browser_fingerprint: fingerprint,
        p_success: success,
        p_performance_metrics: {
          timestamp: Date.now(),
          memory: (performance as any).memory ? {
            used: (performance as any).memory.usedJSHeapSize,
            total: (performance as any).memory.totalJSHeapSize
          } : null
        }
      });
    } catch (error) {
      console.error('Failed to log session activity:', error);
    }
  };

  // Log authentication events
  const logAuthEvent = async (eventType: string, eventData?: any, severity: 'info' | 'warning' | 'error' | 'critical' = 'info') => {
    if (!user) return;

    try {
      await supabase.rpc('log_auth_event', {
        p_user_id: user.id,
        p_event_type: eventType,
        p_event_data: eventData,
        p_severity: severity
      });
    } catch (error) {
      console.error('Failed to log auth event:', error);
    }
  };

  // Validate session health
  const validateSessionHealth = async (): Promise<SessionValidation | null> => {
    if (!user || !session) return null;

    try {
      const { data, error } = await supabase.rpc('validate_session_health', {
        p_user_id: user.id,
        p_session_id: sessionIdRef.current || session.access_token.substring(0, 8)
      });

      if (error) throw error;

      const result = data[0];
      return {
        isValid: result.is_valid,
        issues: result.issues || [],
        recommendations: result.recommendations || []
      };
    } catch (error) {
      console.error('Failed to validate session health:', error);
      return null;
    }
  };

  // Calculate auth health metrics
  const calculateHealthMetrics = async (): Promise<AuthHealthMetrics | null> => {
    try {
      await supabase.rpc('calculate_auth_health_metrics');
      
      const { data, error } = await supabase
        .from('auth_health_metrics')
        .select('*')
        .eq('time_window', '24h')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      const metrics = data.reduce((acc, metric) => {
        acc[metric.metric_type] = metric.metric_value;
        return acc;
      }, {} as any);

      return {
        loginSuccessRate: metrics.login_success_rate || 100,
        avgSessionDuration: metrics.avg_session_duration || 0,
        errorRate: metrics.error_rate || 0,
        lastCalculated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to calculate health metrics:', error);
      return null;
    }
  };

  // Auto-cleanup sessions
  const performAutoCleanup = async () => {
    try {
      const { data, error } = await supabase.rpc('auto_cleanup_sessions');
      if (error) throw error;
      console.log('Auto cleanup result:', data);
      return data;
    } catch (error) {
      console.error('Failed to perform auto cleanup:', error);
      return null;
    }
  };

  // Fetch recent auth events
  const fetchAuthEvents = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('auth_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAuthEvents(data || []);
    } catch (error) {
      console.error('Failed to fetch auth events:', error);
    }
  };

  // Start monitoring
  const startMonitoring = async () => {
    if (!user || isMonitoring) return;

    setIsMonitoring(true);
    sessionIdRef.current = crypto.randomUUID();

    // Log session start
    await logSessionActivity('enhanced_session_start', {
      enhancedMonitoring: true,
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`
    });

    // Initial health check
    const validation = await validateSessionHealth();
    setSessionValidation(validation);

    const metrics = await calculateHealthMetrics();
    setHealthMetrics(metrics);

    await fetchAuthEvents();

    // Set up periodic health checks
    const healthCheckInterval = setInterval(async () => {
      const newValidation = await validateSessionHealth();
      setSessionValidation(newValidation);

      if (newValidation && !newValidation.isValid) {
        await logAuthEvent('session_health_warning', {
          issues: newValidation.issues,
          recommendations: newValidation.recommendations
        }, 'warning');
      }
    }, 60000); // Check every minute

    // Set up metrics calculation
    const metricsInterval = setInterval(async () => {
      const newMetrics = await calculateHealthMetrics();
      setHealthMetrics(newMetrics);
    }, 300000); // Calculate every 5 minutes

    // Auto cleanup every hour
    const cleanupInterval = setInterval(performAutoCleanup, 3600000);

    // Listen for critical auth events
    const criticalEventChannel = supabase
      .channel('auth_critical_events')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'auth_events',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new.severity === 'critical') {
            console.warn('Critical auth event detected:', payload.new);
            fetchAuthEvents(); // Refresh events
          }
        }
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      clearInterval(healthCheckInterval);
      clearInterval(metricsInterval);
      clearInterval(cleanupInterval);
      criticalEventChannel.unsubscribe();
      setIsMonitoring(false);
    };
  };

  // Stop monitoring
  const stopMonitoring = async () => {
    if (!isMonitoring) return;

    await logSessionActivity('enhanced_session_end', {
      sessionDuration: Date.now() - (new Date().getTime()),
      finalHealthCheck: sessionValidation
    });

    setIsMonitoring(false);
    sessionIdRef.current = null;
  };

  // Enhanced error recovery
  const performEnhancedRecovery = async () => {
    await logAuthEvent('enhanced_recovery_initiated', {
      reason: 'User requested enhanced recovery',
      currentState: { user: !!user, session: !!session, loading }
    }, 'warning');

    // Perform auto cleanup first
    await performAutoCleanup();

    // Validate session health
    const validation = await validateSessionHealth();
    
    if (validation && !validation.isValid) {
      await logAuthEvent('recovery_session_invalid', {
        issues: validation.issues,
        recommendations: validation.recommendations
      }, 'error');
      
      // If session is invalid, trigger nuclear reset
      const { nuclearReset } = useAuth();
      await nuclearReset();
    }

    return validation;
  };

  // Start monitoring when user logs in
  useEffect(() => {
    if (user && !loading && !isMonitoring) {
      startMonitoring();
    }

    return () => {
      if (isMonitoring) {
        stopMonitoring();
      }
    };
  }, [user, loading]);

  // Log authentication state changes
  useEffect(() => {
    if (!loading) {
      if (user) {
        logAuthEvent('auth_state_authenticated', {
          userId: user.id,
          email: user.email
        });
      } else {
        logAuthEvent('auth_state_unauthenticated', {
          previousSession: !!session
        });
      }
    }
  }, [user, loading]);

  return {
    // Enhanced auth state
    user,
    session,
    loading,
    authError,
    isMonitoring,
    
    // Health monitoring
    healthMetrics,
    sessionValidation,
    authEvents,
    
    // Enhanced functions
    logSessionActivity,
    logAuthEvent,
    validateSessionHealth,
    calculateHealthMetrics,
    performAutoCleanup,
    performEnhancedRecovery,
    fetchAuthEvents,
    
    // Monitoring controls
    startMonitoring,
    stopMonitoring
  };
}