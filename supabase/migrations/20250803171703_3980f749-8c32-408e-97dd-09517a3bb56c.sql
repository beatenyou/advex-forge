-- Fix the RLS policy to handle NULL values properly
DROP POLICY IF EXISTS "Users can view their org members" ON public.organization_members;

CREATE POLICY "Users can view their org members" 
ON public.organization_members 
FOR SELECT 
USING (
  -- Allow admins to see all organization members
  (public.get_user_role_for_policy(auth.uid()) = 'admin')
  OR
  -- Allow organization members to see members in their organizations
  (
    public.get_user_organization_ids(auth.uid()) IS NOT NULL 
    AND organization_id = ANY(public.get_user_organization_ids(auth.uid()))
  )
);

-- Also improve the get_user_organization_ids function to handle cases better
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