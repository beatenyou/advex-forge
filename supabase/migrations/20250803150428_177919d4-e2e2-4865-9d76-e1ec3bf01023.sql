-- Enhanced user profiles with all necessary fields for centralized auth
-- Add missing columns to existing profiles table
DO $$ 
BEGIN
    -- Add subscription_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'subscription_status') THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_status text DEFAULT 'free';
    END IF;
    
    -- Add is_pro column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'is_pro') THEN
        ALTER TABLE public.profiles ADD COLUMN is_pro boolean DEFAULT false;
    END IF;
    
    -- Add permissions column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'permissions') THEN
        ALTER TABLE public.profiles ADD COLUMN permissions text[] DEFAULT '{}';
    END IF;
END $$;

-- Create a comprehensive function to get complete user data
CREATE OR REPLACE FUNCTION public.get_complete_user_profile(target_user_id uuid)
RETURNS TABLE(
    user_id uuid,
    email text,
    display_name text,
    role text,
    subscription_status text,
    is_pro boolean,
    permissions text[],
    ai_usage_current integer,
    ai_quota_limit integer,
    plan_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.user_id,
        p.email,
        p.display_name,
        p.role,
        COALESCE(p.subscription_status, ub.subscription_status, 'free') as subscription_status,
        COALESCE(p.is_pro, 
                 (p.role = 'admin'), 
                 (bp.name ILIKE '%pro%' OR bp.name ILIKE '%premium%') AND 
                 (ub.subscription_status = 'active' OR ub.subscription_status = 'trialing'),
                 false) as is_pro,
        COALESCE(p.permissions, 
                 CASE 
                     WHEN p.role = 'admin' THEN ARRAY['admin', 'user', 'pro']
                     WHEN COALESCE(p.is_pro, false) THEN ARRAY['user', 'pro']
                     ELSE ARRAY['user']
                 END) as permissions,
        COALESCE(ub.ai_usage_current, 0) as ai_usage_current,
        COALESCE(ub.ai_quota_limit, 50) as ai_quota_limit,
        COALESCE(bp.name, 'Free') as plan_name
    FROM public.profiles p
    LEFT JOIN public.user_billing ub ON p.user_id = ub.user_id
    LEFT JOIN public.billing_plans bp ON ub.plan_id = bp.id
    WHERE p.user_id = target_user_id;
END;
$$;

-- Update the trigger to sync profile data with billing changes
CREATE OR REPLACE FUNCTION public.sync_profile_with_billing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

-- Create trigger for billing changes
DROP TRIGGER IF EXISTS trigger_sync_profile_billing ON public.user_billing;
CREATE TRIGGER trigger_sync_profile_billing
    AFTER INSERT OR UPDATE ON public.user_billing
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_profile_with_billing();