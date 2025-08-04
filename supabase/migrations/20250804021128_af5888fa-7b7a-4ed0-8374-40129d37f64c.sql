-- Fix default AI provider inconsistency and add admin override functions

-- Update ai_chat_config to use consistent defaults (Mistral Agent as primary)
UPDATE public.ai_chat_config 
SET 
  default_provider_id = '5b8ed312-286b-44d5-abc8-1b6dacf6bd0c',
  primary_provider_id = '5b8ed312-286b-44d5-abc8-1b6dacf6bd0c',
  default_user_primary_model_id = '5b8ed312-286b-44d5-abc8-1b6dacf6bd0c',
  default_user_secondary_model_id = '76fae55a-4aa1-4e00-88b4-894bd7d3bb90'
WHERE id = 'f4f26089-988f-487e-b4ec-50b15220bf3d';

-- Function to update global defaults and reset user preferences
CREATE OR REPLACE FUNCTION public.admin_update_default_provider(
  new_primary_model_id UUID,
  new_secondary_model_id UUID DEFAULT NULL,
  admin_user_id UUID DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_role TEXT;
BEGIN
  -- Check if user is admin
  SELECT role INTO admin_role FROM profiles WHERE user_id = admin_user_id;
  
  IF admin_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Only admins can update default providers';
  END IF;
  
  -- Update global config
  UPDATE public.ai_chat_config 
  SET 
    default_provider_id = new_primary_model_id,
    primary_provider_id = new_primary_model_id,
    default_user_primary_model_id = new_primary_model_id,
    default_user_secondary_model_id = new_secondary_model_id,
    updated_at = NOW();
  
  -- Clear all user model preferences so they get the new default
  DELETE FROM public.user_preferences 
  WHERE key = 'selected_model_id';
  
  -- Broadcast the change to all connected clients
  PERFORM pg_notify('default_provider_changed', json_build_object(
    'new_primary_model_id', new_primary_model_id,
    'new_secondary_model_id', new_secondary_model_id,
    'admin_user_id', admin_user_id,
    'timestamp', extract(epoch from now()) * 1000
  )::text);
  
  -- Log the action
  INSERT INTO public.admin_notes (
    title,
    content,
    category,
    created_by
  ) VALUES (
    'Default AI Provider Updated',
    FORMAT('Admin updated default provider to %s', new_primary_model_id),
    'System',
    admin_user_id
  );
  
  RETURN TRUE;
END;
$$;

-- Function to get current effective model for a user (respects admin defaults)
CREATE OR REPLACE FUNCTION public.get_user_effective_model(target_user_id UUID)
RETURNS TABLE(provider_id UUID, provider_name TEXT, is_user_preference BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_preference_id UUID;
  default_config_id UUID;
BEGIN
  -- Check if user has a saved preference
  SELECT value::UUID INTO user_preference_id
  FROM public.user_preferences 
  WHERE user_id = target_user_id 
  AND key = 'selected_model_id';
  
  -- If user has preference, return it
  IF user_preference_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      ap.id,
      ap.name,
      true as is_user_preference
    FROM public.ai_providers ap
    WHERE ap.id = user_preference_id;
    RETURN;
  END IF;
  
  -- Otherwise return system default
  SELECT default_user_primary_model_id INTO default_config_id
  FROM public.ai_chat_config
  LIMIT 1;
  
  RETURN QUERY
  SELECT 
    ap.id,
    ap.name,
    false as is_user_preference
  FROM public.ai_providers ap
  WHERE ap.id = default_config_id;
END;
$$;