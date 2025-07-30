-- Configure default models and grant access to existing users

-- First, get the Mistral provider ID and update ai_chat_config
DO $$
DECLARE
    mistral_provider_id UUID;
BEGIN
    -- Get the Mistral provider ID
    SELECT id INTO mistral_provider_id 
    FROM ai_providers 
    WHERE type = 'mistral' 
    LIMIT 1;
    
    -- Update ai_chat_config to set default models
    IF mistral_provider_id IS NOT NULL THEN
        UPDATE ai_chat_config 
        SET 
            default_user_primary_model_id = mistral_provider_id,
            default_user_secondary_model_id = mistral_provider_id,
            updated_at = NOW()
        WHERE id = (SELECT id FROM ai_chat_config LIMIT 1);
        
        -- If no config exists, create it
        IF NOT FOUND THEN
            INSERT INTO ai_chat_config (
                default_user_primary_model_id,
                default_user_secondary_model_id,
                is_enabled,
                system_prompt,
                max_tokens,
                temperature,
                request_timeout_seconds,
                failover_enabled
            ) VALUES (
                mistral_provider_id,
                mistral_provider_id,
                true,
                'You are a helpful AI assistant. Provide clear, concise, and accurate responses.',
                1000,
                0.7,
                30,
                true
            );
        END IF;
        
        -- Grant model access to all existing users
        INSERT INTO user_model_access (user_id, provider_id, granted_by)
        SELECT 
            p.user_id,
            mistral_provider_id,
            NULL
        FROM profiles p
        WHERE NOT EXISTS (
            SELECT 1 FROM user_model_access uma 
            WHERE uma.user_id = p.user_id 
            AND uma.provider_id = mistral_provider_id
        );
        
    END IF;
END $$;