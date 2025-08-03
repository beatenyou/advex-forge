-- Fix missing search_path for existing functions that need it
ALTER FUNCTION public.get_user_role(uuid) SET search_path = 'public';
ALTER FUNCTION public.has_permission(uuid, user_role) SET search_path = 'public';