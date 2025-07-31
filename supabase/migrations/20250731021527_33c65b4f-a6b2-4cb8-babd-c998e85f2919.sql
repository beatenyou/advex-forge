-- Fix function search path security warning
CREATE OR REPLACE FUNCTION public.broadcast_ai_model_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only broadcast if selected_model_id changed
  IF (TG_OP = 'UPDATE' AND OLD.selected_model_id IS DISTINCT FROM NEW.selected_model_id) OR TG_OP = 'INSERT' THEN
    -- Get provider details for the broadcast
    PERFORM pg_notify('ai_model_changed', json_build_object(
      'user_id', NEW.user_id,
      'selected_model_id', NEW.selected_model_id,
      'timestamp', extract(epoch from now()) * 1000
    )::text);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';