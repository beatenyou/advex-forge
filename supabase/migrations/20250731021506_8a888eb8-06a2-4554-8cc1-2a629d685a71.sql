-- Enable realtime for user_preferences table
ALTER TABLE public.user_preferences REPLICA IDENTITY FULL;

-- Add user_preferences to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_preferences;

-- Create function to broadcast AI model changes
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for AI model change broadcasting
DROP TRIGGER IF EXISTS trigger_broadcast_ai_model_change ON public.user_preferences;
CREATE TRIGGER trigger_broadcast_ai_model_change
  AFTER INSERT OR UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_ai_model_change();