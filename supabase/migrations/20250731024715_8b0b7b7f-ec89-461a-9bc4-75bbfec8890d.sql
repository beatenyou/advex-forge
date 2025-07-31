-- Fix the increment_model_usage function to ensure it works correctly
CREATE OR REPLACE FUNCTION public.increment_model_usage(
  user_id_param uuid, 
  provider_id_param uuid, 
  tokens_used_param integer DEFAULT 1, 
  response_time_param integer DEFAULT NULL, 
  session_id_param uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  quota_check RECORD;
  access_exists BOOLEAN := FALSE;
BEGIN
  -- Log function call for debugging
  RAISE LOG 'increment_model_usage called: user_id=%, provider_id=%, tokens=%', 
    user_id_param, provider_id_param, tokens_used_param;
  
  -- Check current quota first
  SELECT * INTO quota_check FROM check_model_quota(user_id_param, provider_id_param);
  
  -- If quota exceeded, return false
  IF NOT quota_check.can_use_model THEN
    RAISE LOG 'increment_model_usage: quota exceeded for user % provider %', 
      user_id_param, provider_id_param;
    RETURN FALSE;
  END IF;
  
  -- Check if user_model_access record exists
  SELECT EXISTS(
    SELECT 1 FROM user_model_access 
    WHERE user_id = user_id_param AND provider_id = provider_id_param
  ) INTO access_exists;
  
  -- If no access record exists, create one (for default models)
  IF NOT access_exists THEN
    RAISE LOG 'increment_model_usage: creating access record for user % provider %', 
      user_id_param, provider_id_param;
    
    INSERT INTO user_model_access (
      user_id, 
      provider_id, 
      granted_by, 
      is_enabled, 
      usage_limit, 
      usage_current
    ) VALUES (
      user_id_param, 
      provider_id_param, 
      NULL, 
      true, 
      NULL, -- unlimited for default models
      1 -- start with 1 usage
    );
  ELSE
    -- Update existing record
    UPDATE user_model_access 
    SET usage_current = COALESCE(usage_current, 0) + 1
    WHERE user_id = user_id_param 
    AND provider_id = provider_id_param;
    
    RAISE LOG 'increment_model_usage: updated usage for user % provider %', 
      user_id_param, provider_id_param;
  END IF;
  
  -- Insert analytics record
  INSERT INTO model_usage_analytics (
    user_id,
    provider_id,
    session_id,
    tokens_used,
    response_time_ms,
    success,
    created_at
  ) VALUES (
    user_id_param,
    provider_id_param,
    session_id_param,
    tokens_used_param,
    response_time_param,
    TRUE,
    NOW()
  );
  
  RAISE LOG 'increment_model_usage: inserted analytics record for user % provider %', 
    user_id_param, provider_id_param;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'increment_model_usage ERROR: % - %', SQLSTATE, SQLERRM;
    RETURN FALSE;
END;
$$;

-- Create a trigger to automatically update model access manager stats
CREATE OR REPLACE FUNCTION public.broadcast_model_usage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Broadcast model usage change for real-time updates
  PERFORM pg_notify('model_usage_changed', json_build_object(
    'user_id', COALESCE(NEW.user_id, OLD.user_id),
    'provider_id', COALESCE(NEW.provider_id, OLD.provider_id),
    'usage_current', COALESCE(NEW.usage_current, 0),
    'timestamp', extract(epoch from now()) * 1000
  )::text);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for user_model_access changes
DROP TRIGGER IF EXISTS trigger_model_usage_change ON public.user_model_access;
CREATE TRIGGER trigger_model_usage_change
  AFTER INSERT OR UPDATE OF usage_current ON public.user_model_access
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_model_usage_change();