-- Clean up all orphaned user sessions
UPDATE public.user_sessions 
SET session_end = NOW(), 
    duration_seconds = EXTRACT(EPOCH FROM (NOW() - session_start))::INTEGER
WHERE session_end IS NULL;

-- Create improved auth cleanup function
CREATE OR REPLACE FUNCTION public.nuclear_auth_reset(target_user_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- If specific user, clean only their sessions
  IF target_user_id IS NOT NULL THEN
    UPDATE public.user_sessions 
    SET session_end = NOW(), 
        duration_seconds = EXTRACT(EPOCH FROM (NOW() - session_start))::INTEGER
    WHERE user_id = target_user_id 
    AND session_end IS NULL;
    
    INSERT INTO public.user_activity_log (
      user_id,
      activity_type,
      description
    ) VALUES (
      target_user_id,
      'nuclear_auth_reset',
      'User performed nuclear auth reset'
    );
  ELSE
    -- Clean all orphaned sessions
    UPDATE public.user_sessions 
    SET session_end = NOW(), 
        duration_seconds = EXTRACT(EPOCH FROM (NOW() - session_start))::INTEGER
    WHERE session_end IS NULL;
  END IF;
END;
$function$;