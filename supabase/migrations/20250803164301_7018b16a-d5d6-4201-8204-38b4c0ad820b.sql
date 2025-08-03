-- Fix security issues by adding RLS policies and functions
-- Create security definer functions first
CREATE OR REPLACE FUNCTION public.get_user_organization_role(target_user_id UUID)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT role 
  FROM public.organization_members 
  WHERE user_id = target_user_id AND is_active = true
  LIMIT 1;
$$;

-- RLS Policies for organizations
CREATE POLICY "Users can view their organization" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Org admins can update their organization" ON public.organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner') AND is_active = true
    )
  );

CREATE POLICY "System can insert organizations" ON public.organizations
  FOR INSERT WITH CHECK (true);

-- RLS Policies for organization members
CREATE POLICY "Users can view their org members" ON public.organization_members
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Org admins can manage members" ON public.organization_members
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner') AND is_active = true
    ) OR auth.uid() = user_id
  );

-- RLS Policies for teams
CREATE POLICY "Org members can view teams" ON public.teams
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Org admins can manage teams" ON public.teams
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner') AND is_active = true
    )
  );

-- RLS Policies for team members
CREATE POLICY "Team members can view team membership" ON public.team_members
  FOR SELECT USING (
    team_id IN (
      SELECT t.id FROM public.teams t
      JOIN public.organization_members om ON t.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.is_active = true
    )
  );

CREATE POLICY "Team members can manage membership" ON public.team_members
  FOR ALL USING (
    team_id IN (
      SELECT t.id FROM public.teams t
      JOIN public.organization_members om ON t.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.role IN ('admin', 'owner') AND om.is_active = true
    ) OR auth.uid() = user_id
  );

-- RLS Policies for permissions (viewable by all authenticated users)
CREATE POLICY "Authenticated users can view permissions" ON public.permissions
  FOR SELECT TO authenticated USING (true);

-- RLS Policies for user permissions
CREATE POLICY "Users can view their permissions" ON public.user_permissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage user permissions" ON public.user_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS for audit log (org members can view their org's audit log)
CREATE POLICY "Org members can view audit log" ON public.audit_log
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "System can insert audit log" ON public.audit_log
  FOR INSERT WITH CHECK (true);

-- Create optimized function for user profile with organization data
CREATE OR REPLACE FUNCTION public.get_enterprise_user_profile(target_user_id UUID)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  display_name TEXT,
  role TEXT,
  subscription_status TEXT,
  is_pro BOOLEAN,
  permissions TEXT[],
  ai_usage_current INTEGER,
  ai_quota_limit INTEGER,
  plan_name TEXT,
  organization_id UUID,
  organization_name TEXT,
  organization_role TEXT,
  teams JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.email,
    p.display_name,
    p.role,
    COALESCE(p.subscription_status, ub.subscription_status, 'free') as subscription_status,
    CASE 
      WHEN p.role = 'admin' THEN true
      ELSE COALESCE(p.is_pro, false)
    END as is_pro,
    COALESCE(p.permissions, ARRAY['user']) as permissions,
    COALESCE(ub.ai_usage_current, 0) as ai_usage_current,
    COALESCE(ub.ai_quota_limit, 50) as ai_quota_limit,
    COALESCE(bp.name, 'Free') as plan_name,
    o.id as organization_id,
    o.name as organization_name,
    om.role as organization_role,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'name', t.name,
          'role', tm.role
        )
      )
      FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = target_user_id),
      '[]'::jsonb
    ) as teams
  FROM public.profiles p
  LEFT JOIN public.user_billing ub ON p.user_id = ub.user_id
  LEFT JOIN public.billing_plans bp ON ub.plan_id = bp.id
  LEFT JOIN public.organization_members om ON p.user_id = om.user_id AND om.is_active = true
  LEFT JOIN public.organizations o ON om.organization_id = o.id AND o.is_active = true
  WHERE p.user_id = target_user_id;
END;
$$;

-- Create bulk user management function
CREATE OR REPLACE FUNCTION public.bulk_invite_users(
  org_id UUID,
  user_emails TEXT[],
  default_role TEXT DEFAULT 'member',
  invited_by_user_id UUID DEFAULT NULL
)
RETURNS TABLE(
  email TEXT,
  status TEXT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  email_item TEXT;
BEGIN
  -- Check if the inviting user has permission
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = org_id 
    AND user_id = COALESCE(invited_by_user_id, auth.uid())
    AND role IN ('admin', 'owner')
    AND is_active = true
  ) THEN
    RETURN QUERY SELECT 
      ''::TEXT as email,
      'error'::TEXT as status,
      'Permission denied: Only org admins can invite users'::TEXT as message;
    RETURN;
  END IF;

  FOREACH email_item IN ARRAY user_emails
  LOOP
    BEGIN
      -- Check if user already exists in auth
      IF EXISTS (SELECT 1 FROM auth.users WHERE email = email_item) THEN
        -- User exists, add them to organization
        INSERT INTO public.organization_members (organization_id, user_id, role, invited_by)
        SELECT org_id, id, default_role, invited_by_user_id
        FROM auth.users 
        WHERE email = email_item
        ON CONFLICT (organization_id, user_id) DO NOTHING;
        
        RETURN QUERY SELECT 
          email_item,
          'added'::TEXT,
          'User added to organization'::TEXT;
      ELSE
        -- User doesn't exist, would need invitation system
        RETURN QUERY SELECT 
          email_item,
          'invited'::TEXT,
          'Invitation sent (requires invitation system implementation)'::TEXT;
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

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- Get user's organization
  SELECT organization_id INTO user_org_id
  FROM public.organization_members
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;

  INSERT INTO public.audit_log (
    user_id,
    organization_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    user_org_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_old_values,
    p_new_values
  );
END;
$$;