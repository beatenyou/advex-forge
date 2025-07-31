-- Create the missing trigger on user_preferences table to broadcast AI model changes
CREATE TRIGGER broadcast_ai_model_change_trigger
  AFTER INSERT OR UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_ai_model_change();