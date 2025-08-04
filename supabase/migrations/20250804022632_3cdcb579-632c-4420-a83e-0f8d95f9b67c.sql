-- Create a function to reset user preferences to admin defaults when needed
CREATE OR REPLACE FUNCTION reset_user_to_admin_defaults(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_default_id UUID;
  user_has_access BOOLEAN := FALSE;
BEGIN
  -- Get the admin-configured default primary model
  SELECT default_user_primary_model_id INTO admin_default_id
  FROM ai_chat_config
  LIMIT 1;
  
  -- Check if user has access to the admin default model
  IF admin_default_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM user_model_access 
      WHERE user_id = target_user_id 
      AND provider_id = admin_default_id 
      AND is_enabled = true
    ) INTO user_has_access;
    
    -- If user doesn't have access, grant it (for default models)
    IF NOT user_has_access THEN
      INSERT INTO user_model_access (user_id, provider_id, granted_by, is_enabled, usage_limit, usage_current)
      VALUES (target_user_id, admin_default_id, NULL, true, NULL, 0)
      ON CONFLICT (user_id, provider_id) DO UPDATE SET is_enabled = true;
    END IF;
    
    -- Update user preference to use admin default
    UPDATE user_preferences 
    SET selected_model_id = admin_default_id, updated_at = NOW()
    WHERE user_id = target_user_id;
    
    -- Insert if no preference exists
    INSERT INTO user_preferences (user_id, selected_model_id)
    VALUES (target_user_id, admin_default_id)
    ON CONFLICT (user_id) DO UPDATE SET 
      selected_model_id = admin_default_id,
      updated_at = NOW();
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;