-- Create security definer function to check if user is organization admin
CREATE OR REPLACE FUNCTION public.is_organization_admin(target_user_id uuid, target_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.organization_members 
    WHERE user_id = target_user_id 
    AND organization_id = target_org_id 
    AND role IN ('admin', 'owner') 
    AND is_active = true
  );
$$;

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Org admins can manage their org members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can manage their own membership" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view their org members" ON public.organization_members;
DROP POLICY IF EXISTS "Global admins can manage all org members" ON public.organization_members;

-- Create new simplified policies that use only security definer functions
CREATE POLICY "Organization admins can manage members in their orgs" 
ON public.organization_members 
FOR ALL 
USING (
  public.get_user_role_for_policy(auth.uid()) = 'admin' 
  OR public.is_organization_admin(auth.uid(), organization_id)
);

-- Allow users to manage their own membership
CREATE POLICY "Users can manage their own membership" 
ON public.organization_members 
FOR ALL 
USING (auth.uid() = user_id);

-- Allow users to view members in their organizations  
CREATE POLICY "Users can view organization members" 
ON public.organization_members 
FOR SELECT 
USING (
  public.get_user_role_for_policy(auth.uid()) = 'admin'
  OR organization_id = ANY (public.get_user_organization_ids(auth.uid()))
);