-- Update AI providers to use proper secret names instead of exposed keys
UPDATE ai_providers 
SET api_key_secret_name = 'OPENAI_API_KEY'
WHERE type = 'openai' AND api_key_secret_name LIKE 'sk-%';

UPDATE ai_providers 
SET api_key_secret_name = 'MISTRAL_API_KEY'
WHERE type = 'mistral' AND api_key_secret_name NOT IN ('MISTRAL_API_KEY');

-- Log this critical security fix
INSERT INTO user_activity_log (
  user_id,
  activity_type,
  description
) 
SELECT 
  '00000000-0000-0000-0000-000000000000'::uuid,
  'security_fix',
  'Fixed exposed API keys in ai_providers table - moved to Supabase secrets';