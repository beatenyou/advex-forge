-- Phase 1: Enterprise Infrastructure Setup
-- Create organizations table for multi-tenant structure
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  domain TEXT,
  settings JSONB DEFAULT '{}',
  subscription_plan TEXT DEFAULT 'free',
  seat_limit INTEGER DEFAULT 50,
  seat_used INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create teams table for user grouping
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Create organization members table
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  permissions JSONB DEFAULT '[]',
  invited_by UUID,
  joined_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(organization_id, user_id)
);

-- Create team members table
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Add organization_id to profiles for enterprise linking
ALTER TABLE public.profiles ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Create permission matrix table
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true
);

-- Create user permissions table for fine-grained control
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted_by UUID,
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id, permission_id)
);

-- Insert default permissions
INSERT INTO public.permissions (name, description, category) VALUES
('dashboard.view', 'View dashboard', 'dashboard'),
('chat.create', 'Create chat sessions', 'chat'),
('chat.delete', 'Delete chat sessions', 'chat'),
('attack_plans.view', 'View attack plans', 'plans'),
('attack_plans.create', 'Create attack plans', 'plans'),
('attack_plans.edit', 'Edit attack plans', 'plans'),
('techniques.view', 'View techniques', 'techniques'),
('admin.users.view', 'View all users', 'admin'),
('admin.users.edit', 'Edit user accounts', 'admin'),
('admin.billing.view', 'View billing information', 'admin'),
('admin.analytics.view', 'View analytics', 'admin'),
('org.members.invite', 'Invite organization members', 'organization'),
('org.members.remove', 'Remove organization members', 'organization'),
('org.settings.edit', 'Edit organization settings', 'organization');

-- Enable RLS on new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view their organization" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Org admins can update their organization" ON public.organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- RLS Policies for organization members
CREATE POLICY "Users can view their org members" ON public.organization_members
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Org admins can manage members" ON public.organization_members
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- RLS Policies for teams
CREATE POLICY "Org members can view teams" ON public.teams
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
  );

-- RLS Policies for permissions (viewable by all authenticated users)
CREATE POLICY "Authenticated users can view permissions" ON public.permissions
  FOR SELECT TO authenticated USING (true);

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
  invite_result RECORD;
BEGIN
  -- Check if the inviting user has permission
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = org_id 
    AND user_id = COALESCE(invited_by_user_id, auth.uid())
    AND role IN ('admin', 'owner')
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
        -- User doesn't exist, create invitation record (implement invitation system separately)
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

-- Add performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_members_user_org 
  ON public.organization_members(user_id, organization_id) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_user_team 
  ON public.team_members(user_id, team_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_organization 
  ON public.profiles(organization_id) WHERE organization_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_permissions_user 
  ON public.user_permissions(user_id) WHERE expires_at IS NULL OR expires_at > now();

-- Add audit trail for enterprise operations
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES public.organizations(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- RLS for audit log (org members can view their org's audit log)
CREATE POLICY "Org members can view audit log" ON public.audit_log
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
  );

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