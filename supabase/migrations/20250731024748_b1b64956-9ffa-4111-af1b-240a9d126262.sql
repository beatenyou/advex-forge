-- Create a function to manually backfill model usage data for testing
CREATE OR REPLACE FUNCTION public.backfill_model_usage_from_interactions()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  interaction_record RECORD;
  provider_count INTEGER := 0;
  updated_count INTEGER := 0;
BEGIN
  RAISE LOG 'Starting manual model usage backfill...';
  
  -- Loop through successful AI interactions that have provider names
  FOR interaction_record IN 
    SELECT 
      ai.user_id,
      ai.provider_name,
      ai.tokens_used,
      ai.response_time_ms,
      ai.session_id,
      ai.created_at,
      ap.id as provider_id
    FROM ai_interactions ai
    LEFT JOIN ai_providers ap ON ai.provider_name = ap.name
    WHERE ai.success = true 
    AND ai.provider_name IS NOT NULL
    AND ap.id IS NOT NULL
    ORDER BY ai.created_at ASC
  LOOP
    provider_count := provider_count + 1;
    
    -- Create or update user_model_access record
    INSERT INTO user_model_access (
      user_id,
      provider_id,
      granted_by,
      is_enabled,
      usage_limit,
      usage_current
    ) VALUES (
      interaction_record.user_id,
      interaction_record.provider_id,
      NULL,
      true,
      NULL, -- unlimited
      1
    ) ON CONFLICT (user_id, provider_id) 
    DO UPDATE SET
      usage_current = user_model_access.usage_current + 1;
    
    -- Check if this was an update
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Create model_usage_analytics record if it doesn't exist
    INSERT INTO model_usage_analytics (
      user_id,
      provider_id,
      session_id,
      tokens_used,
      response_time_ms,
      success,
      created_at
    ) VALUES (
      interaction_record.user_id,
      interaction_record.provider_id,
      interaction_record.session_id,
      interaction_record.tokens_used,
      interaction_record.response_time_ms,
      true,
      interaction_record.created_at
    ) ON CONFLICT (id) DO NOTHING; -- Only insert if doesn't exist
    
  END LOOP;
  
  RAISE LOG 'Backfill completed. Processed % interactions.', provider_count;
  
  RETURN FORMAT('Backfill completed successfully. Processed %s AI interactions and updated %s user access records.', 
                provider_count, updated_count);
EXCEPTION
  WHEN OTHERS THEN
    RETURN FORMAT('Backfill failed with error: %s - %s', SQLSTATE, SQLERRM);
END;
$$;