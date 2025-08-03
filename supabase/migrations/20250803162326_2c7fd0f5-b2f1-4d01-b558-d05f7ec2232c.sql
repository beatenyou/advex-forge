-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION public.get_user_role(target_user_id uuid)
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT role_enum FROM public.profiles WHERE user_id = target_user_id;
$$;

CREATE OR REPLACE FUNCTION public.has_permission(target_user_id uuid, required_role public.user_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT 
    CASE 
      WHEN public.get_user_role(target_user_id) = 'admin' THEN true
      WHEN required_role = 'pro' AND public.get_user_role(target_user_id) IN ('pro', 'admin') THEN true
      WHEN required_role = 'user' AND public.get_user_role(target_user_id) IN ('user', 'pro', 'admin') THEN true
      ELSE false
    END;
$$;