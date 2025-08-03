-- Create security definer functions to avoid RLS recursion
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
  SELECT array_agg(organization_id) 
  FROM public.organization_members 
  WHERE user_id = target_user_id AND is_active = true;
$$;

-- Fix the recursive RLS policies
DROP POLICY IF EXISTS "Users can view their org members" ON public.organization_members;

CREATE POLICY "Users can view their org members" 
ON public.organization_members 
FOR SELECT 
USING (
  -- Allow admins to see all organization members
  (public.get_user_role_for_policy(auth.uid()) = 'admin')
  OR
  -- Allow organization members to see members in their organizations
  (organization_id = ANY(public.get_user_organization_ids(auth.uid())))
);

-- Also fix the organizations policy to use the security definer function
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;

CREATE POLICY "Users can view their organization" 
ON public.organizations 
FOR SELECT 
USING (
  -- Allow admins to see all organizations
  (public.get_user_role_for_policy(auth.uid()) = 'admin')
  OR 
  -- Allow organization members to see their organization
  (id = ANY(public.get_user_organization_ids(auth.uid())))
);