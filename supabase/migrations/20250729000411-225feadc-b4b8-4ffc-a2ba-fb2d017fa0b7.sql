-- Add agent support to AI providers
ALTER TABLE public.ai_providers 
ADD COLUMN agent_id TEXT,
ADD COLUMN agent_name TEXT,
ADD COLUMN agent_description TEXT;

-- Add comment to explain the new columns
COMMENT ON COLUMN public.ai_providers.agent_id IS 'Mistral Agent ID for using custom agents';
COMMENT ON COLUMN public.ai_providers.agent_name IS 'Display name for the Mistral Agent';
COMMENT ON COLUMN public.ai_providers.agent_description IS 'Description of what the Mistral Agent does';