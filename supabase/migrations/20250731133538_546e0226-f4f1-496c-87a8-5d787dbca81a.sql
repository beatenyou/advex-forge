-- Create a trigger to broadcast model changes for real-time synchronization
CREATE OR REPLACE FUNCTION public.broadcast_model_selection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Broadcast the model change to all connected clients
  PERFORM pg_notify('model_selection_changed', json_build_object(
    'user_id', NEW.user_id,
    'selected_model_id', NEW.selected_model_id,
    'timestamp', extract(epoch from now()) * 1000
  )::text);
  
  RETURN NEW;
END;
$function$;

-- Create trigger on user_preferences table to broadcast model changes
DROP TRIGGER IF EXISTS on_model_selection_changed ON public.user_preferences;
CREATE TRIGGER on_model_selection_changed
  AFTER UPDATE OF selected_model_id ON public.user_preferences
  FOR EACH ROW
  WHEN (OLD.selected_model_id IS DISTINCT FROM NEW.selected_model_id)
  EXECUTE FUNCTION public.broadcast_model_selection();