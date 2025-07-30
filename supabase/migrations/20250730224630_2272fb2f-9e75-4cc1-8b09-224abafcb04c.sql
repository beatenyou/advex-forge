-- Grant existing users access to default models if configured
DO $$
DECLARE
  primary_model_id UUID;
  secondary_model_id UUID;
  user_record RECORD;
BEGIN
  -- Get default models from config
  SELECT default_user_primary_model_id, default_user_secondary_model_id
  INTO primary_model_id, secondary_model_id
  FROM public.ai_chat_config
  LIMIT 1;
  
  -- If we have configured default models, grant access to existing users
  IF primary_model_id IS NOT NULL OR secondary_model_id IS NOT NULL THEN
    FOR user_record IN SELECT user_id FROM public.profiles LOOP
      -- Grant primary model access
      IF primary_model_id IS NOT NULL THEN
        INSERT INTO public.user_model_access (user_id, provider_id, granted_by)
        VALUES (user_record.user_id, primary_model_id, NULL)
        ON CONFLICT (user_id, provider_id) DO NOTHING;
      END IF;
      
      -- Grant secondary model access
      IF secondary_model_id IS NOT NULL THEN
        INSERT INTO public.user_model_access (user_id, provider_id, granted_by)
        VALUES (user_record.user_id, secondary_model_id, NULL)
        ON CONFLICT (user_id, provider_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;
END;
$$;