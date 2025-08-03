-- Clean up duplicate user sessions and orphaned auth sessions
DELETE FROM public.user_sessions 
WHERE user_id = '29c32282-cfff-46d7-9a95-53314d335175' 
AND session_end IS NULL;

-- Create function to clean auth tokens and reset session state
CREATE OR REPLACE FUNCTION public.force_clean_user_auth(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clean up any stale user sessions
  UPDATE public.user_sessions 
  SET session_end = NOW(), 
      duration_seconds = EXTRACT(EPOCH FROM (NOW() - session_start))::INTEGER
  WHERE user_id = target_user_id 
  AND session_end IS NULL;
  
  -- Log the cleanup
  INSERT INTO public.user_activity_log (
    user_id,
    activity_type,
    description
  ) VALUES (
    target_user_id,
    'auth_cleanup',
    'System cleaned stale auth sessions'
  );
END;
$$;