-- Fix the check_model_quota function to handle schema issues and improve logic
CREATE OR REPLACE FUNCTION public.check_model_quota(user_id_param uuid, provider_id_param uuid)
 RETURNS TABLE(can_use_model boolean, current_usage integer, usage_limit integer, provider_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  access_record RECORD;
  provider_record RECORD;
  config_record RECORD;
BEGIN
  -- Get provider info
  SELECT name INTO provider_record FROM public.ai_providers WHERE id = provider_id_param;
  
  -- Get user model access record
  SELECT * INTO access_record 
  FROM public.user_model_access 
  WHERE user_id = user_id_param 
  AND provider_id = provider_id_param 
  AND is_enabled = true;
  
  -- If no access record, check if this is a default model from config
  IF access_record IS NULL THEN
    SELECT * INTO config_record FROM public.ai_chat_config LIMIT 1;
    
    -- If this is a default model, create access record and allow unlimited access
    IF config_record.default_user_primary_model_id = provider_id_param OR 
       config_record.default_user_secondary_model_id = provider_id_param THEN
      
      -- Create the access record for default model
      INSERT INTO public.user_model_access (
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
        NULL, -- NULL means unlimited
        0
      ) ON CONFLICT (user_id, provider_id) DO NOTHING;
      
      -- Return unlimited access for default models
      RETURN QUERY SELECT 
        true as can_use_model,
        0 as current_usage,
        NULL::integer as usage_limit,
        COALESCE(provider_record.name, 'Unknown') as provider_name;
      RETURN;
    ELSE
      -- Not a default model and no access record, deny access
      RETURN QUERY SELECT 
        false as can_use_model,
        0 as current_usage,
        0 as usage_limit,
        COALESCE(provider_record.name, 'Unknown') as provider_name;
      RETURN;
    END IF;
  END IF;
  
  -- If no usage limit set (NULL), allow unlimited access
  IF access_record.usage_limit IS NULL THEN
    RETURN QUERY SELECT 
      true as can_use_model,
      COALESCE(access_record.usage_current, 0) as current_usage,
      NULL::integer as usage_limit,
      COALESCE(provider_record.name, 'Unknown') as provider_name;
    RETURN;
  END IF;
  
  -- Check if quota exceeded
  RETURN QUERY SELECT 
    (COALESCE(access_record.usage_current, 0) < access_record.usage_limit) as can_use_model,
    COALESCE(access_record.usage_current, 0) as current_usage,
    access_record.usage_limit as usage_limit,
    COALESCE(provider_record.name, 'Unknown') as provider_name;
END;
$function$;

-- Create function to ensure default model access for all users
CREATE OR REPLACE FUNCTION public.ensure_default_model_access_for_all_users()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  config_record RECORD;
  user_record RECORD;
BEGIN
  -- Get default models from config
  SELECT default_user_primary_model_id, default_user_secondary_model_id
  INTO config_record
  FROM public.ai_chat_config
  LIMIT 1;
  
  -- For each user, ensure they have access to default models
  FOR user_record IN SELECT user_id FROM public.profiles LOOP
    -- Grant primary model access
    IF config_record.default_user_primary_model_id IS NOT NULL THEN
      INSERT INTO public.user_model_access (user_id, provider_id, granted_by, usage_limit, usage_current)
      VALUES (user_record.user_id, config_record.default_user_primary_model_id, NULL, NULL, 0)
      ON CONFLICT (user_id, provider_id) DO NOTHING;
    END IF;
    
    -- Grant secondary model access
    IF config_record.default_user_secondary_model_id IS NOT NULL THEN
      INSERT INTO public.user_model_access (user_id, provider_id, granted_by, usage_limit, usage_current)
      VALUES (user_record.user_id, config_record.default_user_secondary_model_id, NULL, NULL, 0)
      ON CONFLICT (user_id, provider_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$function$;

-- Run the function to ensure all existing users have default model access
SELECT public.ensure_default_model_access_for_all_users();