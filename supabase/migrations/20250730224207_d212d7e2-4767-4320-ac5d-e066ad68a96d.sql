-- Create table for user-specific model access
CREATE TABLE public.user_model_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  granted_by UUID,
  UNIQUE(user_id, provider_id)
);

-- Enable RLS
ALTER TABLE public.user_model_access ENABLE ROW LEVEL SECURITY;

-- Users can view their own model access
CREATE POLICY "Users can view their own model access"
ON public.user_model_access FOR SELECT
USING (auth.uid() = user_id);

-- Admins can manage all model access
CREATE POLICY "Admins can manage all model access"
ON public.user_model_access FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- System can insert model access for new users
CREATE POLICY "System can insert model access"
ON public.user_model_access FOR INSERT
WITH CHECK (true);

-- Add default user model configuration to ai_chat_config
ALTER TABLE public.ai_chat_config 
ADD COLUMN default_user_primary_model_id UUID,
ADD COLUMN default_user_secondary_model_id UUID;

-- Function to grant default model access to new users
CREATE OR REPLACE FUNCTION public.grant_default_model_access()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  primary_model_id UUID;
  secondary_model_id UUID;
BEGIN
  -- Get default models from config
  SELECT default_user_primary_model_id, default_user_secondary_model_id
  INTO primary_model_id, secondary_model_id
  FROM public.ai_chat_config
  LIMIT 1;
  
  -- Grant primary model access
  IF primary_model_id IS NOT NULL THEN
    INSERT INTO public.user_model_access (user_id, provider_id, granted_by)
    VALUES (NEW.user_id, primary_model_id, NULL)
    ON CONFLICT (user_id, provider_id) DO NOTHING;
  END IF;
  
  -- Grant secondary model access
  IF secondary_model_id IS NOT NULL THEN
    INSERT INTO public.user_model_access (user_id, provider_id, granted_by)
    VALUES (NEW.user_id, secondary_model_id, NULL)
    ON CONFLICT (user_id, provider_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger on profile creation
CREATE TRIGGER grant_user_model_access_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.grant_default_model_access();