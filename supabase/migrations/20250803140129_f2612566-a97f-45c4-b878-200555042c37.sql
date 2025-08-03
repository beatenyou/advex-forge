-- Enhanced Auth Monitoring and Session Management for Pro Plan
-- Phase 1: Comprehensive Auth Event Logging

-- Create enhanced session audit log with detailed tracking
CREATE TABLE IF NOT EXISTS public.session_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id UUID,
  action TEXT NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  browser_fingerprint TEXT,
  success BOOLEAN DEFAULT true,
  error_details JSONB,
  performance_metrics JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create auth health metrics table
CREATE TABLE IF NOT EXISTS public.auth_health_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL, -- 'session_duration', 'login_success_rate', 'error_rate', etc.
  metric_value NUMERIC NOT NULL,
  time_window TEXT NOT NULL, -- '1h', '24h', '7d'
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create real-time auth events table
CREATE TABLE IF NOT EXISTS public.auth_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  event_type TEXT NOT NULL, -- 'login', 'logout', 'token_refresh', 'session_conflict', etc.
  event_data JSONB,
  severity TEXT DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for all new tables
ALTER TABLE public.session_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;

-- Create policies for session audit log
CREATE POLICY "Users can view their own session audit logs"
ON public.session_audit_log FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert session audit logs"
ON public.session_audit_log FOR INSERT
WITH CHECK (true);

-- Create policies for auth health metrics (admin only)
CREATE POLICY "Admins can view auth health metrics"
ON public.auth_health_metrics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "System can insert auth health metrics"
ON public.auth_health_metrics FOR INSERT
WITH CHECK (true);

-- Create policies for auth events
CREATE POLICY "Users can view their own auth events"
ON public.auth_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all auth events"
ON public.auth_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "System can insert auth events"
ON public.auth_events FOR INSERT
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_audit_log_user_id ON public.session_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_session_audit_log_created_at ON public.session_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_session_audit_log_action ON public.session_audit_log(action);

CREATE INDEX IF NOT EXISTS idx_auth_health_metrics_type ON public.auth_health_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_auth_health_metrics_created_at ON public.auth_health_metrics(created_at);

CREATE INDEX IF NOT EXISTS idx_auth_events_user_id ON public.auth_events(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_events_type ON public.auth_events(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_events_created_at ON public.auth_events(created_at);
CREATE INDEX IF NOT EXISTS idx_auth_events_severity ON public.auth_events(severity);

-- Enhanced session management functions
CREATE OR REPLACE FUNCTION public.log_session_activity(
  p_user_id UUID,
  p_session_id UUID,
  p_action TEXT,
  p_details JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_browser_fingerprint TEXT DEFAULT NULL,
  p_success BOOLEAN DEFAULT TRUE,
  p_error_details JSONB DEFAULT NULL,
  p_performance_metrics JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.session_audit_log (
    user_id,
    session_id,
    action,
    details,
    ip_address,
    user_agent,
    browser_fingerprint,
    success,
    error_details,
    performance_metrics
  ) VALUES (
    p_user_id,
    p_session_id,
    p_action,
    p_details,
    p_ip_address,
    p_user_agent,
    p_browser_fingerprint,
    p_success,
    p_error_details,
    p_performance_metrics
  );
END;
$$;

-- Function to log auth events
CREATE OR REPLACE FUNCTION public.log_auth_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_event_data JSONB DEFAULT NULL,
  p_severity TEXT DEFAULT 'info'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.auth_events (
    user_id,
    event_type,
    event_data,
    severity
  ) VALUES (
    p_user_id,
    p_event_type,
    p_event_data,
    p_severity
  );
  
  -- If it's a critical event, also notify real-time listeners
  IF p_severity = 'critical' THEN
    PERFORM pg_notify('auth_critical_event', json_build_object(
      'user_id', p_user_id,
      'event_type', p_event_type,
      'event_data', p_event_data,
      'timestamp', extract(epoch from now()) * 1000
    )::text);
  END IF;
END;
$$;

-- Function to calculate auth health metrics
CREATE OR REPLACE FUNCTION public.calculate_auth_health_metrics()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  login_success_rate NUMERIC;
  avg_session_duration NUMERIC;
  error_rate NUMERIC;
BEGIN
  -- Calculate login success rate (last 24h)
  SELECT 
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*))
      ELSE 100
    END
  INTO login_success_rate
  FROM public.session_audit_log
  WHERE action = 'login' 
  AND created_at > NOW() - INTERVAL '24 hours';
  
  -- Calculate average session duration (last 24h)
  SELECT AVG(duration_seconds)
  INTO avg_session_duration
  FROM public.user_sessions
  WHERE created_at > NOW() - INTERVAL '24 hours'
  AND session_end IS NOT NULL;
  
  -- Calculate error rate (last 24h)
  SELECT 
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE success = false) * 100.0 / COUNT(*))
      ELSE 0
    END
  INTO error_rate
  FROM public.session_audit_log
  WHERE created_at > NOW() - INTERVAL '24 hours';
  
  -- Insert metrics
  INSERT INTO public.auth_health_metrics (metric_type, metric_value, time_window)
  VALUES 
    ('login_success_rate', COALESCE(login_success_rate, 100), '24h'),
    ('avg_session_duration', COALESCE(avg_session_duration, 0), '24h'),
    ('error_rate', COALESCE(error_rate, 0), '24h');
END;
$$;

-- Function for enhanced session validation
CREATE OR REPLACE FUNCTION public.validate_session_health(
  p_user_id UUID,
  p_session_id UUID
)
RETURNS TABLE(
  is_valid BOOLEAN,
  issues JSONB,
  recommendations JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  session_count INTEGER;
  last_activity TIMESTAMP WITH TIME ZONE;
  validation_issues JSONB := '[]'::JSONB;
  validation_recommendations JSONB := '[]'::JSONB;
  session_valid BOOLEAN := true;
BEGIN
  -- Check for multiple active sessions
  SELECT COUNT(*)
  INTO session_count
  FROM public.user_sessions
  WHERE user_id = p_user_id
  AND session_end IS NULL;
  
  IF session_count > 3 THEN
    validation_issues := validation_issues || jsonb_build_array('multiple_active_sessions');
    validation_recommendations := validation_recommendations || jsonb_build_array('cleanup_old_sessions');
    session_valid := false;
  END IF;
  
  -- Check last activity
  SELECT MAX(created_at)
  INTO last_activity
  FROM public.session_audit_log
  WHERE user_id = p_user_id
  AND session_id = p_session_id;
  
  IF last_activity < NOW() - INTERVAL '30 minutes' THEN
    validation_issues := validation_issues || jsonb_build_array('stale_session');
    validation_recommendations := validation_recommendations || jsonb_build_array('refresh_session');
  END IF;
  
  RETURN QUERY SELECT session_valid, validation_issues, validation_recommendations;
END;
$$;

-- Function to auto-cleanup problematic sessions
CREATE OR REPLACE FUNCTION public.auto_cleanup_sessions()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  cleanup_count INTEGER := 0;
BEGIN
  -- Close sessions that have been inactive for more than 24 hours
  UPDATE public.user_sessions 
  SET 
    session_end = NOW(),
    duration_seconds = EXTRACT(EPOCH FROM (NOW() - session_start))::INTEGER
  WHERE session_end IS NULL
  AND session_start < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  
  -- Log the cleanup
  INSERT INTO public.auth_events (
    user_id,
    event_type,
    event_data,
    severity
  )
  SELECT 
    user_id,
    'auto_session_cleanup',
    jsonb_build_object(
      'sessions_closed', cleanup_count,
      'cleanup_time', NOW()
    ),
    'info'
  FROM public.user_sessions
  WHERE session_end = NOW()
  LIMIT 1;
  
  RETURN FORMAT('Auto-cleanup completed: %s sessions closed', cleanup_count);
END;
$$;