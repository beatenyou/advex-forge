-- Create function to mass provision organization members with pro access
CREATE OR REPLACE FUNCTION public.mass_provision_org_members(
  org_id uuid,
  admin_user_id uuid,
  interactions_per_member integer DEFAULT 150
)
RETURNS TABLE(
  user_id uuid,
  email text,
  status text,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  org_record RECORD;
  member_record RECORD;
  total_cost integer;
  member_count integer;
BEGIN
  -- Check permissions
  IF NOT public.is_organization_admin(admin_user_id, org_id) 
     AND public.get_user_role_for_policy(admin_user_id) != 'admin' THEN
    RETURN QUERY SELECT 
      NULL::uuid,
      ''::text,
      'error'::text,
      'Permission denied: Only organization admins can provision members'::text;
    RETURN;
  END IF;

  -- Get organization and member count
  SELECT * INTO org_record FROM public.organizations WHERE id = org_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      NULL::uuid,
      ''::text,
      'error'::text,
      'Organization not found'::text;
    RETURN;
  END IF;

  -- Count active members
  SELECT COUNT(*) INTO member_count 
  FROM public.organization_members 
  WHERE organization_id = org_id AND is_active = true;

  -- Calculate total cost
  total_cost := member_count * interactions_per_member;

  -- Check if organization has enough credits
  IF (org_record.ai_credits_pool - org_record.ai_credits_used) < total_cost THEN
    RETURN QUERY SELECT 
      NULL::uuid,
      ''::text,
      'error'::text,
      FORMAT('Insufficient credits. Need %s, have %s', total_cost, (org_record.ai_credits_pool - org_record.ai_credits_used))::text;
    RETURN;
  END IF;

  -- Update organization credit usage
  UPDATE public.organizations 
  SET ai_credits_used = ai_credits_used + total_cost
  WHERE id = org_id;

  -- Provision each member
  FOR member_record IN 
    SELECT om.user_id, p.email 
    FROM public.organization_members om
    JOIN public.profiles p ON om.user_id = p.user_id
    WHERE om.organization_id = org_id AND om.is_active = true
  LOOP
    BEGIN
      -- Update user billing
      INSERT INTO public.user_billing (user_id, ai_quota_limit, ai_usage_current, subscription_status)
      VALUES (member_record.user_id, interactions_per_member, 0, 'organization')
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        ai_quota_limit = GREATEST(user_billing.ai_quota_limit, interactions_per_member),
        subscription_status = 'organization',
        updated_at = now();

      -- Update profile to pro status
      UPDATE public.profiles 
      SET 
        role_enum = 'pro'::user_role,
        is_pro = true,
        updated_at = now()
      WHERE user_id = member_record.user_id;

      RETURN QUERY SELECT 
        member_record.user_id,
        member_record.email,
        'success'::text,
        FORMAT('Provisioned %s interactions', interactions_per_member)::text;

    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 
        member_record.user_id,
        member_record.email,
        'error'::text,
        SQLERRM::text;
    END;
  END LOOP;

  -- Record the transaction
  INSERT INTO public.organization_credit_transactions (
    organization_id,
    transaction_type,
    amount,
    balance_after,
    admin_user_id,
    description
  ) VALUES (
    org_id,
    'mass_provision',
    total_cost,
    org_record.ai_credits_pool - org_record.ai_credits_used - total_cost,
    admin_user_id,
    FORMAT('Mass provisioned %s members with %s interactions each', member_count, interactions_per_member)
  );
END;
$$;

-- Enhanced bulk create and assign users function
CREATE OR REPLACE FUNCTION public.enhanced_bulk_create_and_assign_users(
  org_id uuid,
  user_emails text[],
  default_role text DEFAULT 'member',
  access_level text DEFAULT 'user',
  provision_interactions integer DEFAULT 0,
  admin_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE(
  email text,
  status text,
  message text,
  user_id uuid,
  temp_password text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  email_item TEXT;
  existing_user_id UUID;
  org_record RECORD;
  total_cost integer;
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

  -- Calculate total cost if provisioning interactions
  IF provision_interactions > 0 THEN
    total_cost := array_length(user_emails, 1) * provision_interactions;
    
    -- Check if organization has enough credits
    IF (org_record.ai_credits_pool - org_record.ai_credits_used) < total_cost THEN
      RETURN QUERY SELECT 
        ''::TEXT,
        'error'::TEXT,
        FORMAT('Insufficient credits for provisioning. Need %s, have %s', total_cost, (org_record.ai_credits_pool - org_record.ai_credits_used))::TEXT,
        NULL::uuid,
        ''::TEXT;
      RETURN;
    END IF;
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

        -- Provision interactions if requested
        IF provision_interactions > 0 THEN
          INSERT INTO public.user_billing (user_id, ai_quota_limit, ai_usage_current, subscription_status)
          VALUES (existing_user_id, provision_interactions, 0, 'organization')
          ON CONFLICT (user_id) 
          DO UPDATE SET 
            ai_quota_limit = GREATEST(user_billing.ai_quota_limit, provision_interactions),
            subscription_status = 'organization',
            updated_at = now();

          -- Update to pro if provisioning interactions
          UPDATE public.profiles 
          SET 
            role_enum = 'pro'::user_role,
            is_pro = true,
            organization_id = org_id,
            updated_at = now()
          WHERE user_id = existing_user_id;
        ELSE
          -- Just update organization
          UPDATE public.profiles 
          SET 
            organization_id = org_id,
            updated_at = now()
          WHERE user_id = existing_user_id;
        END IF;
        
        RETURN QUERY SELECT 
          email_item,
          'added'::TEXT,
          CASE 
            WHEN provision_interactions > 0 THEN FORMAT('User added with %s interactions', provision_interactions)
            ELSE 'User added to organization'
          END::TEXT,
          existing_user_id,
          ''::TEXT;
      ELSE
        -- For new users, we can't create auth accounts directly
        -- This would require additional setup with Supabase auth admin functions
        RETURN QUERY SELECT 
          email_item,
          'pending'::TEXT,
          'User will be invited to create account and join organization'::TEXT,
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

  -- Update organization credits if interactions were provisioned
  IF provision_interactions > 0 THEN
    UPDATE public.organizations 
    SET ai_credits_used = ai_credits_used + (SELECT COUNT(*) FROM unnest(user_emails) WHERE status = 'added') * provision_interactions
    WHERE id = org_id;

    -- Record transaction
    INSERT INTO public.organization_credit_transactions (
      organization_id,
      transaction_type,
      amount,
      balance_after,
      admin_user_id,
      description
    ) VALUES (
      org_id,
      'bulk_provision',
      (SELECT COUNT(*) FROM unnest(user_emails)) * provision_interactions,
      org_record.ai_credits_pool - org_record.ai_credits_used - ((SELECT COUNT(*) FROM unnest(user_emails)) * provision_interactions),
      admin_user_id,
      FORMAT('Bulk provisioned %s users with %s interactions each', array_length(user_emails, 1), provision_interactions)
    );
  END IF;
END;
$$;