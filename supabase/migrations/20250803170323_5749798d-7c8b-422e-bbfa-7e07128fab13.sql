-- Insert test organizations
INSERT INTO public.organizations (name, slug, seat_limit, seat_used, subscription_plan, domain, created_by, settings) VALUES
('Acme Security Corp', 'acme-security', 100, 15, 'enterprise', 'acme-security.com', (SELECT user_id FROM public.profiles WHERE role = 'admin' LIMIT 1), '{"two_factor_required": true, "sso_enabled": true}'),
('CyberDefense Solutions', 'cyberdefense-solutions', 50, 8, 'professional', 'cyberdefense.com', (SELECT user_id FROM public.profiles WHERE role = 'admin' LIMIT 1), '{"two_factor_required": false, "sso_enabled": false}'),
('RedTeam Innovations', 'redteam-innovations', 25, 12, 'professional', 'redteam.io', (SELECT user_id FROM public.profiles WHERE role = 'admin' LIMIT 1), '{"two_factor_required": true, "sso_enabled": false}'),
('SecOps Consulting', 'secops-consulting', 10, 3, 'starter', NULL, (SELECT user_id FROM public.profiles WHERE role = 'admin' LIMIT 1), '{"two_factor_required": false, "sso_enabled": false}');

-- Insert organization members (using existing profiles)
INSERT INTO public.organization_members (organization_id, user_id, role, invited_by) 
SELECT 
  o.id,
  p.user_id,
  CASE 
    WHEN p.role = 'admin' THEN 'owner'
    WHEN ROW_NUMBER() OVER (PARTITION BY o.id ORDER BY p.created_at) = 1 THEN 'admin'
    WHEN ROW_NUMBER() OVER (PARTITION BY o.id ORDER BY p.created_at) <= 3 THEN 'member'
    ELSE 'member'
  END as role,
  (SELECT user_id FROM public.profiles WHERE role = 'admin' LIMIT 1)
FROM public.organizations o
CROSS JOIN public.profiles p
WHERE p.role IN ('user', 'admin', 'pro')
LIMIT 20;

-- Insert teams within organizations
INSERT INTO public.teams (name, description, organization_id, created_by, settings) 
SELECT 
  team_name,
  team_description,
  org_id,
  (SELECT user_id FROM public.profiles WHERE role = 'admin' LIMIT 1),
  '{"default_permissions": ["read", "write"]}'
FROM (
  VALUES 
    ('Red Team', 'Offensive security and penetration testing team', (SELECT id FROM public.organizations WHERE slug = 'acme-security')),
    ('Blue Team', 'Defensive security and incident response team', (SELECT id FROM public.organizations WHERE slug = 'acme-security')),
    ('Security Architecture', 'Security design and architecture team', (SELECT id FROM public.organizations WHERE slug = 'acme-security')),
    ('Penetration Testing', 'External and internal penetration testing', (SELECT id FROM public.organizations WHERE slug = 'cyberdefense-solutions')),
    ('Security Operations', 'SOC and monitoring operations', (SELECT id FROM public.organizations WHERE slug = 'cyberdefense-solutions')),
    ('Research & Development', 'Security research and tool development', (SELECT id FROM public.organizations WHERE slug = 'redteam-innovations')),
    ('Client Services', 'Customer engagement and consulting', (SELECT id FROM public.organizations WHERE slug = 'redteam-innovations')),
    ('Core Team', 'Main consulting and operations team', (SELECT id FROM public.organizations WHERE slug = 'secops-consulting'))
) AS teams(team_name, team_description, org_id);

-- Add team members
INSERT INTO public.team_members (team_id, user_id, role)
SELECT 
  t.id,
  om.user_id,
  CASE 
    WHEN om.role = 'owner' THEN 'lead'
    WHEN om.role = 'admin' THEN 'lead'
    ELSE 'member'
  END
FROM public.teams t
JOIN public.organization_members om ON t.organization_id = om.organization_id
WHERE om.is_active = true
LIMIT 30;

-- Insert sample model usage analytics
INSERT INTO public.model_usage_analytics (user_id, provider_id, session_id, tokens_used, response_time_ms, success, cost_estimate, created_at)
SELECT 
  p.user_id,
  ap.id,
  gen_random_uuid(),
  FLOOR(RANDOM() * 2000 + 100)::INTEGER,
  FLOOR(RANDOM() * 3000 + 200)::INTEGER,
  RANDOM() > 0.1,
  RANDOM() * 0.05,
  NOW() - (RANDOM() * INTERVAL '30 days')
FROM public.profiles p
CROSS JOIN public.ai_providers ap
WHERE ap.is_active = true
LIMIT 50;

-- Insert sample audit log entries
INSERT INTO public.audit_log (user_id, organization_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent)
SELECT 
  om.user_id,
  om.organization_id,
  actions.action,
  actions.resource_type,
  gen_random_uuid(),
  '{"previous": "value"}'::jsonb,
  '{"new": "value"}'::jsonb,
  ('192.168.1.' || FLOOR(RANDOM() * 254 + 1)::TEXT)::inet,
  'Mozilla/5.0 (Test Browser)'
FROM public.organization_members om
CROSS JOIN (
  VALUES 
    ('user_invited', 'user'),
    ('role_changed', 'user'),
    ('team_created', 'team'),
    ('settings_updated', 'organization'),
    ('permission_granted', 'permission')
) AS actions(action, resource_type)
WHERE om.is_active = true
LIMIT 25;

-- Insert performance metrics
INSERT INTO public.performance_metrics (metric_type, metric_value, metric_unit, service_name, recorded_at)
SELECT 
  metric_types.metric_type,
  RANDOM() * metric_types.max_value + metric_types.min_value,
  metric_types.unit,
  services.service_name,
  NOW() - (RANDOM() * INTERVAL '7 days')
FROM (
  VALUES 
    ('response_time', 50, 500, 'ms'),
    ('memory_usage', 30, 90, 'percent'),
    ('cpu_usage', 10, 80, 'percent'),
    ('database_connections', 5, 50, 'count'),
    ('active_sessions', 10, 200, 'count')
) AS metric_types(metric_type, min_value, max_value, unit)
CROSS JOIN (
  VALUES 
    ('api_server'),
    ('database'),
    ('auth_service'),
    ('ai_service')
) AS services(service_name)
LIMIT 40;