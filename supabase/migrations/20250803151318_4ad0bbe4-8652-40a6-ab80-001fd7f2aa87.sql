-- Phase 1: Fix Admin Profile Permissions (Immediate)
-- Update beatenyouog@gmail.com to have correct admin permissions
UPDATE public.profiles 
SET 
  permissions = ARRAY['admin', 'user', 'pro'],
  role = 'admin',
  is_pro = true,
  updated_at = now()
WHERE email = 'beatenyouog@gmail.com';

-- Phase 2: Fix Profile Permission Logic - Update sync_profile_with_billing trigger
CREATE OR REPLACE FUNCTION public.sync_profile_with_billing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Update profile with billing information
    UPDATE public.profiles 
    SET 
        subscription_status = NEW.subscription_status,
        is_pro = CASE 
            WHEN role = 'admin' THEN true
            WHEN EXISTS (
                SELECT 1 FROM public.billing_plans bp 
                WHERE bp.id = NEW.plan_id 
                AND (bp.name ILIKE '%pro%' OR bp.name ILIKE '%premium%')
                AND (NEW.subscription_status = 'active' OR NEW.subscription_status = 'trialing')
            ) THEN true
            ELSE false
        END,
        permissions = CASE 
            WHEN role = 'admin' THEN ARRAY['admin', 'user', 'pro']
            WHEN EXISTS (
                SELECT 1 FROM public.billing_plans bp 
                WHERE bp.id = NEW.plan_id 
                AND (bp.name ILIKE '%pro%' OR bp.name ILIKE '%premium%')
                AND (NEW.subscription_status = 'active' OR NEW.subscription_status = 'trialing')
            ) OR role = 'admin' THEN ARRAY['user', 'pro']
            ELSE ARRAY['user']
        END,
        updated_at = now()
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$function$;

-- Phase 2: Update get_complete_user_profile to always return correct permissions for admins
CREATE OR REPLACE FUNCTION public.get_complete_user_profile(target_user_id uuid)
RETURNS TABLE(user_id uuid, email text, display_name text, role text, subscription_status text, is_pro boolean, permissions text[], ai_usage_current integer, ai_quota_limit integer, plan_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
            ELSE COALESCE(p.is_pro, 
                 (bp.name ILIKE '%pro%' OR bp.name ILIKE '%premium%') AND 
                 (ub.subscription_status = 'active' OR ub.subscription_status = 'trialing'),
                 false)
        END as is_pro,
        CASE 
            WHEN p.role = 'admin' THEN ARRAY['admin', 'user', 'pro']
            WHEN COALESCE(p.is_pro, false) OR 
                 ((bp.name ILIKE '%pro%' OR bp.name ILIKE '%premium%') AND 
                  (ub.subscription_status = 'active' OR ub.subscription_status = 'trialing')) THEN ARRAY['user', 'pro']
            ELSE ARRAY['user']
        END as permissions,
        COALESCE(ub.ai_usage_current, 0) as ai_usage_current,
        COALESCE(ub.ai_quota_limit, 50) as ai_quota_limit,
        COALESCE(bp.name, 'Free') as plan_name
    FROM public.profiles p
    LEFT JOIN public.user_billing ub ON p.user_id = ub.user_id
    LEFT JOIN public.billing_plans bp ON ub.plan_id = bp.id
    WHERE p.user_id = target_user_id;
END;
$function$;

-- Phase 2: Fix all existing admin users' permissions
UPDATE public.profiles 
SET 
  permissions = ARRAY['admin', 'user', 'pro'],
  is_pro = true,
  updated_at = now()
WHERE role = 'admin' AND (permissions IS NULL OR permissions = '{}' OR NOT ('admin' = ANY(permissions)));