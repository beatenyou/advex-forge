-- Add primary and secondary provider columns to ai_chat_config table
ALTER TABLE public.ai_chat_config 
ADD COLUMN primary_provider_id UUID,
ADD COLUMN secondary_provider_id UUID,
ADD COLUMN failover_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN request_timeout_seconds INTEGER NOT NULL DEFAULT 30;

-- Add foreign key constraints
ALTER TABLE public.ai_chat_config 
ADD CONSTRAINT fk_primary_provider 
FOREIGN KEY (primary_provider_id) REFERENCES public.ai_providers(id) ON DELETE SET NULL;

ALTER TABLE public.ai_chat_config 
ADD CONSTRAINT fk_secondary_provider 
FOREIGN KEY (secondary_provider_id) REFERENCES public.ai_providers(id) ON DELETE SET NULL;