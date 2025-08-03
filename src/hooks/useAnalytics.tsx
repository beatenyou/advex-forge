import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsData {
  user_agent?: string;
  referrer?: string;
  browser?: string;
  device_type?: string;
  operating_system?: string;
  country_code?: string;
  city?: string;
}

interface SessionData {
  session_id: string;
  user_id?: string;
  session_start: string;
  pages_visited: number;
  referrer?: string;
  user_agent?: string;
  ip_address?: string;
}

export function useAnalytics() {
  const authContext = useAuth();
  // Use a ref to avoid re-renders when auth changes
  const userRef = useRef(authContext.user);
  const sessionId = useRef<string>();
  const sessionStart = useRef<Date>();
  const pageCount = useRef<number>(0);
  const lastActivity = useRef<Date>(new Date());

  // Initialize session tracking
  useEffect(() => {
    if (!sessionId.current) {
      sessionId.current = crypto.randomUUID();
      sessionStart.current = new Date();
      pageCount.current = 1;
      
      // Track initial page view
      trackPageView();
    }
  }, []);

  // Update user ref when auth changes
  useEffect(() => {
    userRef.current = authContext.user;
  }, [authContext.user]);

  // Create user session when user is authenticated
  useEffect(() => {
    if (userRef.current && sessionId.current && sessionStart.current) {
      createUserSession();
    }
  }, [authContext.user]); // Only depend on user changes

  // Track activity and update session
  useEffect(() => {
    const updateActivity = () => {
      lastActivity.current = new Date();
      pageCount.current += 1;
    };

    // Listen for page navigation
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateActivity();
      } else {
        endSession();
      }
    };

    // Listen for beforeunload to end session
    const handleBeforeUnload = () => {
      endSession();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const getAnalyticsData = (): AnalyticsData => {
    const userAgent = navigator.userAgent;
    const referrer = document.referrer;
    
    // Simple browser detection
    let browser = 'Unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    // Simple device type detection
    let device_type = 'Desktop';
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      device_type = 'Mobile';
    } else if (/Tablet|iPad/.test(userAgent)) {
      device_type = 'Tablet';
    }

    // Simple OS detection
    let operating_system = 'Unknown';
    if (userAgent.includes('Windows')) operating_system = 'Windows';
    else if (userAgent.includes('Mac')) operating_system = 'macOS';
    else if (userAgent.includes('Linux')) operating_system = 'Linux';
    else if (userAgent.includes('Android')) operating_system = 'Android';
    else if (userAgent.includes('iOS')) operating_system = 'iOS';

    return {
      user_agent: userAgent,
      referrer: referrer || undefined,
      browser,
      device_type,
      operating_system,
    };
  };

  const trackPageView = async () => {
    try {
      const analyticsData = getAnalyticsData();
      
      await supabase.from('traffic_analytics').insert({
        session_id: sessionId.current,
        page_path: window.location.pathname,
        referrer_source: analyticsData.referrer,
        browser: analyticsData.browser,
        device_type: analyticsData.device_type,
        operating_system: analyticsData.operating_system,
        country_code: null, // Would need IP geolocation service
        city: null, // Would need IP geolocation service
      });
    } catch (error) {
      console.error('Error tracking page view:', error);
    }
  };

  const createUserSession = async () => {
    if (!sessionId.current || !sessionStart.current || !userRef.current) return;

    try {
      const analyticsData = getAnalyticsData();
      
      await supabase.from('user_sessions').insert({
        id: sessionId.current,
        user_id: userRef.current.id,
        session_start: sessionStart.current.toISOString(),
        pages_visited: pageCount.current,
        referrer: analyticsData.referrer,
        user_agent: analyticsData.user_agent,
        ip_address: null, // Would need server-side IP detection
        is_bounce: pageCount.current === 1,
      });
    } catch (error) {
      console.error('Error creating user session:', error);
    }
  };

  const endSession = async () => {
    if (!sessionId.current || !sessionStart.current) return;

    try {
      const sessionEnd = new Date();
      const durationSeconds = Math.floor((sessionEnd.getTime() - sessionStart.current.getTime()) / 1000);
      
      await supabase.from('user_sessions').update({
        session_end: sessionEnd.toISOString(),
        duration_seconds: durationSeconds,
        pages_visited: pageCount.current,
        is_bounce: pageCount.current === 1,
      }).eq('id', sessionId.current);
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  const trackActivity = async (activityType: string, description?: string) => {
    if (!userRef.current) return;

    try {
      await supabase.from('user_activity_log').insert({
        user_id: userRef.current.id,
        activity_type: activityType,
        description,
        user_agent: navigator.userAgent,
        ip_address: null, // Would need server-side IP detection
      });
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  };

  const trackPerformance = async (metricType: string, value: number, unit: string, serviceName?: string) => {
    try {
      await supabase.from('performance_metrics').insert({
        metric_type: metricType,
        metric_value: value,
        metric_unit: unit,
        service_name: serviceName,
      });
    } catch (error) {
      console.error('Error tracking performance:', error);
    }
  };

  return {
    trackPageView,
    trackActivity,
    trackPerformance,
    sessionId: sessionId.current,
  };
}