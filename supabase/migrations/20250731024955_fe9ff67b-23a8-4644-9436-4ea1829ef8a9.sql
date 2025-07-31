-- Enable realtime for the tables used by ModelAccessManager
ALTER TABLE public.user_model_access REPLICA IDENTITY FULL;
ALTER TABLE public.model_usage_analytics REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_model_access;
ALTER PUBLICATION supabase_realtime ADD TABLE public.model_usage_analytics;