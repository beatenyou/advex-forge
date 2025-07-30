-- Enhance ai_interactions table for detailed error logging
ALTER TABLE public.ai_interactions 
ADD COLUMN IF NOT EXISTS error_details JSONB,
ADD COLUMN IF NOT EXISTS user_context JSONB,
ADD COLUMN IF NOT EXISTS browser_info TEXT;

-- Create index for efficient error querying
CREATE INDEX IF NOT EXISTS idx_ai_interactions_error_type ON public.ai_interactions(error_type);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_success ON public.ai_interactions(success);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_created_at ON public.ai_interactions(created_at);

-- Create index on error_details for JSONB queries
CREATE INDEX IF NOT EXISTS idx_ai_interactions_error_details ON public.ai_interactions USING GIN(error_details);