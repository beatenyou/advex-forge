-- Clean up user roles and permissions system
-- First, ensure we have proper user roles enum
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('user', 'pro', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update profiles table to have clean role structure
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role_enum public.user_role DEFAULT 'user';

-- Update existing profiles to use proper role enum
UPDATE public.profiles 
SET role_enum = CASE 
    WHEN role = 'admin' THEN 'admin'::public.user_role
    WHEN is_pro = true OR subscription_status = 'active' THEN 'pro'::public.user_role
    ELSE 'user'::public.user_role
END;

-- Create clean function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(target_user_id uuid)
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role_enum FROM public.profiles WHERE user_id = target_user_id;
$$;

-- Create function to check user permissions
CREATE OR REPLACE FUNCTION public.has_permission(target_user_id uuid, required_role public.user_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    CASE 
      WHEN get_user_role(target_user_id) = 'admin' THEN true
      WHEN required_role = 'pro' AND get_user_role(target_user_id) IN ('pro', 'admin') THEN true
      WHEN required_role = 'user' AND get_user_role(target_user_id) IN ('user', 'pro', 'admin') THEN true
      ELSE false
    END;
$$;

-- Update profiles RLS policies to use new functions
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create clean RLS policies
CREATE POLICY "Users can view all profiles" ON public.profiles
FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

-- Ensure attack_plans has proper RLS for pro users
DROP POLICY IF EXISTS "Users can view their own attack plans" ON public.attack_plans;
DROP POLICY IF EXISTS "Users can create their own attack plans" ON public.attack_plans;
DROP POLICY IF EXISTS "Users can update their own attack plans" ON public.attack_plans;
DROP POLICY IF EXISTS "Users can delete their own attack plans" ON public.attack_plans;

CREATE POLICY "Pro users can view their own attack plans" ON public.attack_plans
FOR SELECT USING (
  auth.uid() = user_id AND 
  public.has_permission(auth.uid(), 'pro'::public.user_role)
);

CREATE POLICY "Pro users can create their own attack plans" ON public.attack_plans
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND 
  public.has_permission(auth.uid(), 'pro'::public.user_role)
);

CREATE POLICY "Pro users can update their own attack plans" ON public.attack_plans
FOR UPDATE USING (
  auth.uid() = user_id AND 
  public.has_permission(auth.uid(), 'pro'::public.user_role)
);

CREATE POLICY "Pro users can delete their own attack plans" ON public.attack_plans
FOR DELETE USING (
  auth.uid() = user_id AND 
  public.has_permission(auth.uid(), 'pro'::public.user_role)
);