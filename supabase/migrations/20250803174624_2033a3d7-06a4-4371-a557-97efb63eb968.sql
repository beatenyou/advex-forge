-- Add organization_id to profiles table for direct organization reference
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

-- Create function to sync user profile when organization membership changes
CREATE OR REPLACE FUNCTION public.sync_user_profile_on_org_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  org_record RECORD;
BEGIN
  -- Handle INSERT and UPDATE of organization membership
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Get organization details
    SELECT * INTO org_record 
    FROM public.organizations 
    WHERE id = NEW.organization_id AND is_active = true;
    
    IF FOUND THEN
      -- Update user profile with organization context
      UPDATE public.profiles 
      SET 
        organization_id = NEW.organization_id,
        role_enum = CASE 
          WHEN NEW.role IN ('admin', 'owner') THEN 'pro'::user_role
          WHEN org_record.default_member_access_level = 'pro' THEN 'pro'::user_role
          ELSE 'user'::user_role
        END,
        is_pro = CASE 
          WHEN NEW.role IN ('admin', 'owner') THEN true
          WHEN org_record.default_member_access_level = 'pro' THEN true
          ELSE false
        END,
        updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Handle DELETE of organization membership
  IF TG_OP = 'DELETE' THEN
    -- Reset user profile to default when removed from organization
    UPDATE public.profiles 
    SET 
      organization_id = NULL,
      role_enum = 'user'::user_role,
      is_pro = false,
      updated_at = now()
    WHERE user_id = OLD.user_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger for organization membership changes
DROP TRIGGER IF EXISTS trigger_sync_profile_on_org_membership ON public.organization_members;
CREATE TRIGGER trigger_sync_profile_on_org_membership
  AFTER INSERT OR UPDATE OR DELETE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_profile_on_org_membership();

-- Create function to bulk create users and assign to organization
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
        -- Generate temporary password
        generated_password := 'temp_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12);
        
        -- Create new user account
        INSERT INTO auth.users (
          instance_id,
          id,
          aud,
          role,
          email,
          encrypted_password,
          email_confirmed_at,
          confirmation_token,
          confirmation_sent_at,
          recovery_token,
          recovery_sent_at,
          email_change_token_new,
          email_change,
          email_change_sent_at,
          last_sign_in_at,
          raw_app_meta_data,
          raw_user_meta_data,
          is_super_admin,
          created_at,
          updated_at,
          phone,
          phone_confirmed_at,
          phone_change,
          phone_change_token,
          phone_change_sent_at,
          email_change_token_current,
          email_change_confirm_status,
          banned_until,
          reauthentication_token,
          reauthentication_sent_at,
          is_sso_user,
          deleted_at
        ) VALUES (
          '00000000-0000-0000-0000-000000000000'::uuid,
          gen_random_uuid(),
          'authenticated',
          'authenticated',
          email_item,
          crypt(generated_password, gen_salt('bf')),
          now(),
          '',
          now(),
          '',
          now(),
          '',
          '',
          now(),
          now(),
          '{"provider": "email", "providers": ["email"]}'::jsonb,
          '{}'::jsonb,
          false,
          now(),
          now(),
          null,
          null,
          '',
          '',
          now(),
          '',
          0,
          now(),
          '',
          now(),
          false,
          null
        ) RETURNING id INTO new_user_id;
        
        -- Create profile
        INSERT INTO public.profiles (user_id, email, display_name, role, role_enum)
        VALUES (
          new_user_id,
          email_item,
          split_part(email_item, '@', 1),
          'user',
          'user'::user_role
        );
        
        -- Add to organization
        INSERT INTO public.organization_members (organization_id, user_id, role, invited_by)
        VALUES (org_id, new_user_id, default_role, admin_user_id);
        
        RETURN QUERY SELECT 
          email_item,
          'created'::TEXT,
          'New account created and added to organization'::TEXT,
          new_user_id,
          generated_password;
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

-- Create function to get organization context for a user
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