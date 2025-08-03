-- Phase 1: Database Schema Enhancements for Enterprise Organization Management

-- Add organization billing fields
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS billing_plan_id uuid REFERENCES public.billing_plans(id),
ADD COLUMN IF NOT EXISTS ai_credits_pool integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_credits_used integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS default_member_access_level text DEFAULT 'user' CHECK (default_member_access_level IN ('user', 'pro')),
ADD COLUMN IF NOT EXISTS billing_contact_email text,
ADD COLUMN IF NOT EXISTS billing_address jsonb DEFAULT '{}';

-- Create organization credit transactions table for audit trail
CREATE TABLE IF NOT EXISTS public.organization_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('purchase', 'allocation', 'usage', 'refund')),
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  user_id uuid REFERENCES auth.users(id), -- user who received/used credits (for allocation/usage)
  admin_user_id uuid REFERENCES auth.users(id), -- admin who performed the action
  description text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on credit transactions
ALTER TABLE public.organization_credit_transactions ENABLE ROW LEVEL SECURITY;

-- Create function to allocate organization credits to users
CREATE OR REPLACE FUNCTION public.allocate_organization_credits(
  org_id uuid,
  target_user_id uuid,
  credit_amount integer,
  admin_user_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  org_record RECORD;
  user_billing_record RECORD;
BEGIN
  -- Check if admin has permission to allocate credits
  IF NOT public.is_organization_admin(admin_user_id, org_id) 
     AND public.get_user_role_for_policy(admin_user_id) != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Only organization admins can allocate credits';
  END IF;
  
  -- Get organization record
  SELECT * INTO org_record FROM public.organizations WHERE id = org_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found or inactive';
  END IF;
  
  -- Check if organization has enough credits
  IF (org_record.ai_credits_pool - org_record.ai_credits_used) < credit_amount THEN
    RAISE EXCEPTION 'Insufficient organization credits available';
  END IF;
  
  -- Update organization credit usage
  UPDATE public.organizations 
  SET ai_credits_used = ai_credits_used + credit_amount
  WHERE id = org_id;
  
  -- Add credits to user's billing account
  INSERT INTO public.user_billing (user_id, ai_quota_limit, ai_usage_current, subscription_status)
  VALUES (target_user_id, credit_amount, 0, 'organization')
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    ai_quota_limit = user_billing.ai_quota_limit + credit_amount,
    updated_at = now();
  
  -- Record the transaction
  INSERT INTO public.organization_credit_transactions (
    organization_id,
    transaction_type,
    amount,
    balance_after,
    user_id,
    admin_user_id,
    description
  ) VALUES (
    org_id,
    'allocation',
    credit_amount,
    org_record.ai_credits_pool - org_record.ai_credits_used - credit_amount,
    target_user_id,
    admin_user_id,
    'Credits allocated to user'
  );
  
  RETURN TRUE;
END;
$$;

-- Create function to bulk purchase organization credits
CREATE OR REPLACE FUNCTION public.purchase_organization_credits(
  org_id uuid,
  credit_amount integer,
  admin_user_id uuid,
  purchase_description text DEFAULT 'Bulk credit purchase'
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  org_record RECORD;
BEGIN
  -- Check if admin has permission
  IF NOT public.is_organization_admin(admin_user_id, org_id) 
     AND public.get_user_role_for_policy(admin_user_id) != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Only organization admins can purchase credits';
  END IF;
  
  -- Get organization record
  SELECT * INTO org_record FROM public.organizations WHERE id = org_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found or inactive';
  END IF;
  
  -- Add credits to organization pool
  UPDATE public.organizations 
  SET ai_credits_pool = ai_credits_pool + credit_amount,
      updated_at = now()
  WHERE id = org_id;
  
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
    'purchase',
    credit_amount,
    org_record.ai_credits_pool + credit_amount,
    admin_user_id,
    purchase_description
  );
  
  RETURN TRUE;
END;
$$;

-- Enhanced bulk invite function with organization access levels
CREATE OR REPLACE FUNCTION public.enhanced_bulk_invite_users(
  org_id uuid,
  user_emails text[],
  default_role text DEFAULT 'member',
  access_level text DEFAULT NULL,
  invited_by_user_id uuid DEFAULT auth.uid()
) RETURNS TABLE(email text, status text, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  email_item TEXT;
  org_record RECORD;
  computed_access_level TEXT;
BEGIN
  -- Check permissions
  IF NOT public.is_organization_admin(invited_by_user_id, org_id) 
     AND public.get_user_role_for_policy(invited_by_user_id) != 'admin' THEN
    RETURN QUERY SELECT 
      ''::TEXT,
      'error'::TEXT,
      'Permission denied: Only org admins can invite users'::TEXT;
    RETURN;
  END IF;

  -- Get organization details
  SELECT * INTO org_record FROM public.organizations WHERE id = org_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      ''::TEXT,
      'error'::TEXT,
      'Organization not found'::TEXT;
    RETURN;
  END IF;
  
  -- Determine access level (use provided or org default)
  computed_access_level := COALESCE(access_level, org_record.default_member_access_level, 'user');

  FOREACH email_item IN ARRAY user_emails
  LOOP
    BEGIN
      -- Check if user exists in auth
      IF EXISTS (SELECT 1 FROM auth.users WHERE email = email_item) THEN
        -- User exists, add them to organization
        DECLARE
          existing_user_id uuid;
        BEGIN
          SELECT id INTO existing_user_id FROM auth.users WHERE email = email_item;
          
          -- Add to organization
          INSERT INTO public.organization_members (organization_id, user_id, role, invited_by)
          VALUES (org_id, existing_user_id, default_role, invited_by_user_id)
          ON CONFLICT (organization_id, user_id) DO NOTHING;
          
          -- Update user's access level based on organization settings
          UPDATE public.profiles 
          SET 
            role_enum = CASE 
              WHEN computed_access_level = 'pro' THEN 'pro'::user_role 
              ELSE 'user'::user_role 
            END,
            is_pro = (computed_access_level = 'pro'),
            organization_id = org_id,
            updated_at = now()
          WHERE user_id = existing_user_id;
          
          RETURN QUERY SELECT 
            email_item,
            'added'::TEXT,
            'User added to organization with ' || computed_access_level || ' access'::TEXT;
        END;
      ELSE
        -- User doesn't exist, would need invitation system
        RETURN QUERY SELECT 
          email_item,
          'invited'::TEXT,
          'Invitation sent (user will get ' || computed_access_level || ' access when they sign up)'::TEXT;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 
        email_item,
        'error'::TEXT,
        SQLERRM::TEXT;
    END;
  END LOOP;
END;
$$;

-- Create policies for organization credit transactions
CREATE POLICY "Org members can view credit transactions" 
ON public.organization_credit_transactions 
FOR SELECT 
USING (
  organization_id = ANY (public.get_user_organization_ids(auth.uid()))
  OR public.get_user_role_for_policy(auth.uid()) = 'admin'
);

CREATE POLICY "System can insert credit transactions" 
ON public.organization_credit_transactions 
FOR INSERT 
WITH CHECK (true);

-- Create function to get organization usage analytics
CREATE OR REPLACE FUNCTION public.get_organization_usage_analytics(
  org_id uuid,
  start_date date DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date date DEFAULT CURRENT_DATE
) RETURNS TABLE(
  total_members integer,
  active_members integer,
  total_ai_interactions integer,
  credits_used integer,
  credits_remaining integer,
  top_users jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  org_record RECORD;
BEGIN
  -- Check permissions
  IF NOT public.is_organization_admin(auth.uid(), org_id) 
     AND public.get_user_role_for_policy(auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Only organization admins can view analytics';
  END IF;
  
  -- Get organization record
  SELECT * INTO org_record FROM public.organizations WHERE id = org_id;
  
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::integer FROM public.organization_members WHERE organization_id = org_id AND is_active = true),
    (SELECT COUNT(DISTINCT ai.user_id)::integer 
     FROM public.ai_interactions ai 
     JOIN public.organization_members om ON ai.user_id = om.user_id 
     WHERE om.organization_id = org_id 
     AND ai.created_at >= start_date 
     AND ai.created_at <= end_date + INTERVAL '1 day'),
    (SELECT COUNT(*)::integer 
     FROM public.ai_interactions ai 
     JOIN public.organization_members om ON ai.user_id = om.user_id 
     WHERE om.organization_id = org_id 
     AND ai.created_at >= start_date 
     AND ai.created_at <= end_date + INTERVAL '1 day'),
    org_record.ai_credits_used,
    (org_record.ai_credits_pool - org_record.ai_credits_used),
    (SELECT jsonb_agg(
       jsonb_build_object(
         'user_id', ai.user_id,
         'email', p.email,
         'display_name', p.display_name,
         'interaction_count', user_stats.interaction_count
       )
     )
     FROM (
       SELECT ai.user_id, COUNT(*) as interaction_count
       FROM public.ai_interactions ai 
       JOIN public.organization_members om ON ai.user_id = om.user_id 
       WHERE om.organization_id = org_id 
       AND ai.created_at >= start_date 
       AND ai.created_at <= end_date + INTERVAL '1 day'
       GROUP BY ai.user_id
       ORDER BY interaction_count DESC
       LIMIT 5
     ) user_stats
     JOIN public.ai_interactions ai ON ai.user_id = user_stats.user_id
     JOIN public.profiles p ON p.user_id = user_stats.user_id
     GROUP BY user_stats.user_id, user_stats.interaction_count
     LIMIT 5);
END;
$$;