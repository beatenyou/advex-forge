-- Fix infinite recursion in organization_members RLS policies
-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Org admins can manage members" ON public.organization_members;

-- Create new non-recursive policies using security definer functions
CREATE POLICY "Global admins can manage all org members" 
ON public.organization_members 
FOR ALL 
USING (public.get_user_role_for_policy(auth.uid()) = 'admin');

CREATE POLICY "Org admins can manage their org members" 
ON public.organization_members 
FOR ALL 
USING (
  organization_id = ANY(public.get_user_organization_ids(auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.organization_members om 
    WHERE om.user_id = auth.uid() 
    AND om.organization_id = organization_members.organization_id
    AND om.role IN ('admin', 'owner') 
    AND om.is_active = true
  )
);

CREATE POLICY "Users can manage their own membership" 
ON public.organization_members 
FOR ALL 
USING (auth.uid() = user_id);