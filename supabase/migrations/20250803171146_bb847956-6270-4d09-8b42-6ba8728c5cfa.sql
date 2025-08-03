-- Fix organizations RLS policy to allow admins to view all organizations
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;

CREATE POLICY "Users can view their organization" 
ON public.organizations 
FOR SELECT 
USING (
  -- Allow admins to see all organizations
  (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )) 
  OR 
  -- Allow organization members to see their organization
  (id IN (
    SELECT organization_id 
    FROM public.organization_members 
    WHERE user_id = auth.uid() AND is_active = true
  ))
);

-- Fix organization_members RLS policy to allow admins to view all members
DROP POLICY IF EXISTS "Users can view their org members" ON public.organization_members;

CREATE POLICY "Users can view their org members" 
ON public.organization_members 
FOR SELECT 
USING (
  -- Allow admins to see all organization members
  (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ))
  OR
  -- Allow organization members to see members in their organizations
  (organization_id IN (
    SELECT organization_id 
    FROM public.organization_members om2
    WHERE om2.user_id = auth.uid() AND om2.is_active = true
  ))
);