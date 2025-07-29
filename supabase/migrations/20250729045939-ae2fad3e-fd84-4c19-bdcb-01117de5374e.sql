-- Create function to add AI interactions to a user's account (admin only)
CREATE OR REPLACE FUNCTION public.admin_add_ai_interactions(
  target_user_id UUID,
  additional_interactions INTEGER,
  admin_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  admin_role TEXT;
BEGIN
  -- Check if the admin user has admin role
  SELECT role INTO admin_role 
  FROM public.profiles 
  WHERE user_id = admin_user_id;
  
  IF admin_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Only admins can add AI interactions';
  END IF;
  
  -- Add interactions to the user's quota limit (not current usage)
  UPDATE public.user_billing 
  SET 
    ai_quota_limit = ai_quota_limit + additional_interactions,
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  -- If no billing record exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.user_billing (
      user_id,
      ai_usage_current,
      ai_quota_limit,
      subscription_status
    ) VALUES (
      target_user_id,
      0,
      50 + additional_interactions,
      'free'
    );
  END IF;
  
  -- Log the action in user activity
  INSERT INTO public.user_activity_log (
    user_id,
    activity_type,
    description
  ) VALUES (
    target_user_id,
    'ai_interactions_granted',
    'Admin granted ' || additional_interactions || ' additional AI interactions'
  );
  
  RETURN TRUE;
END;
$$;

-- Grant execute permissions to authenticated users (function handles admin check internally)
GRANT EXECUTE ON FUNCTION public.admin_add_ai_interactions(UUID, INTEGER, UUID) TO authenticated;