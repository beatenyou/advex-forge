-- Fix search path security issues by updating functions
CREATE OR REPLACE FUNCTION public.get_user_organization_context(target_user_id uuid)
RETURNS TABLE(organization_id uuid, organization_name text, organization_role text, is_admin boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id as organization_id,
    o.name as organization_name,
    om.role as organization_role,
    (om.role IN ('admin', 'owner')) as is_admin
  FROM public.organization_members om
  JOIN public.organizations o ON om.organization_id = o.id
  WHERE om.user_id = target_user_id 
  AND om.is_active = true 
  AND o.is_active = true
  LIMIT 1;
END;
$$;

-- Update bulk create function with proper search path
CREATE OR REPLACE FUNCTION public.bulk_create_and_assign_users(
  org_id uuid,
  user_emails text[],
  default_role text DEFAULT 'member',
  access_level text DEFAULT 'user',
  admin_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE(email text, status text, message text, user_id uuid, temp_password text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  email_item TEXT;
  existing_user_id UUID;
  new_user_id UUID;
  generated_password TEXT;
  org_record RECORD;
BEGIN
  -- Check permissions
  IF NOT public.is_organization_admin(admin_user_id, org_id) 
     AND public.get_user_role_for_policy(admin_user_id) != 'admin' THEN
    RETURN QUERY SELECT 
      ''::TEXT,
      'error'::TEXT,
      'Permission denied: Only org admins can bulk create users'::TEXT,
      NULL::uuid,
      ''::TEXT;
    RETURN;
  END IF;

  -- Get organization details
  SELECT * INTO org_record FROM public.organizations WHERE id = org_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      ''::TEXT,
      'error'::TEXT,
      'Organization not found'::TEXT,
      NULL::uuid,
      ''::TEXT;
    RETURN;
  END IF;

  FOREACH email_item IN ARRAY user_emails
  LOOP
    BEGIN
      -- Check if user already exists
      SELECT id INTO existing_user_id FROM auth.users WHERE email = email_item;
      
      IF existing_user_id IS NOT NULL THEN
        -- User exists, just add to organization
        INSERT INTO public.organization_members (organization_id, user_id, role, invited_by)
        VALUES (org_id, existing_user_id, default_role, admin_user_id)
        ON CONFLICT (organization_id, user_id) DO NOTHING;
        
        RETURN QUERY SELECT 
          email_item,
          'added'::TEXT,
          'Existing user added to organization'::TEXT,
          existing_user_id,
          ''::TEXT;
      ELSE
        -- For new user creation, we'll use the enhanced_bulk_invite_users function instead
        -- This is safer than directly manipulating auth.users
        RETURN QUERY SELECT 
          email_item,
          'pending'::TEXT,
          'User will be invited to create account'::TEXT,
          NULL::uuid,
          ''::TEXT;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 
        email_item,
        'error'::TEXT,
        SQLERRM::TEXT,
        NULL::uuid,
        ''::TEXT;
    END;
  END LOOP;
END;
$$;