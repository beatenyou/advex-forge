-- Fix the foreign key relationship and update the check_model_quota function

-- Add foreign key constraint between user_model_access and ai_providers
ALTER TABLE user_model_access 
ADD CONSTRAINT fk_user_model_access_provider 
FOREIGN KEY (provider_id) REFERENCES ai_providers(id) ON DELETE CASCADE;

-- Update the check_model_quota function to handle unlimited usage properly
CREATE OR REPLACE FUNCTION public.check_model_quota(user_id_param uuid, provider_id_param uuid)
 RETURNS TABLE(can_use_model boolean, current_usage integer, usage_limit integer, provider_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  access_record RECORD;
  provider_record RECORD;
BEGIN
  -- Get provider info
  SELECT name INTO provider_record FROM ai_providers WHERE id = provider_id_param;
  
  -- Get user model access record
  SELECT * INTO access_record 
  FROM user_model_access 
  WHERE user_id = user_id_param 
  AND provider_id = provider_id_param 
  AND is_enabled = true;
  
  -- If no access record, deny access
  IF access_record IS NULL THEN
    RETURN QUERY SELECT 
      false as can_use_model,
      0 as current_usage,
      0 as usage_limit,
      COALESCE(provider_record.name, 'Unknown') as provider_name;
    RETURN;
  END IF;
  
  -- If no usage limit set (NULL), allow unlimited access
  IF access_record.usage_limit IS NULL THEN
    RETURN QUERY SELECT 
      true as can_use_model,
      COALESCE(access_record.usage_current, 0) as current_usage,
      NULL::integer as usage_limit, -- Return NULL for unlimited
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