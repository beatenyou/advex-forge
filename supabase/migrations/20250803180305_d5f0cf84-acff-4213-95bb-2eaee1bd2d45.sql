-- Fix search path security issues for functions that weren't properly set
CREATE OR REPLACE FUNCTION public.log_auth_event(p_user_id uuid, p_event_type text, p_event_data jsonb DEFAULT NULL::jsonb, p_severity text DEFAULT 'info'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.log_session_activity(p_user_id uuid, p_session_id uuid, p_action text, p_details jsonb DEFAULT NULL::jsonb, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.session_audit_log (
    user_id,
    session_id,
    action,
    details,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_session_id,
    p_action,
    p_details,
    p_ip_address,
    p_user_agent
  );
END;
$$;