-- Add selected_model_id column to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN selected_model_id UUID REFERENCES public.ai_providers(id);