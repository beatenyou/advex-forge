-- Fix search_path security warnings for our functions
CREATE OR REPLACE FUNCTION public.get_user_role_for_policy(target_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role FROM public.profiles WHERE user_id = target_user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_user_organization_ids(target_user_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(array_agg(organization_id), ARRAY[]::uuid[]) 
  FROM public.organization_members 
  WHERE user_id = target_user_id AND is_active = true;
$$;