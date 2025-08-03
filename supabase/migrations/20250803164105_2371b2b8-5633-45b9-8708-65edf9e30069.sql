-- Phase 1: Enterprise Infrastructure Setup (Fixed)
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

-- Add performance indexes (without CONCURRENTLY)
CREATE INDEX idx_organization_members_user_org 
  ON public.organization_members(user_id, organization_id) WHERE is_active = true;

CREATE INDEX idx_team_members_user_team 
  ON public.team_members(user_id, team_id);

CREATE INDEX idx_profiles_organization 
  ON public.profiles(organization_id) WHERE organization_id IS NOT NULL;

CREATE INDEX idx_user_permissions_user 
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