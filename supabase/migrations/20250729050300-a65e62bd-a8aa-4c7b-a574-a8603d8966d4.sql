-- Create function to edit AI usage and quota (admin only)
CREATE OR REPLACE FUNCTION public.admin_edit_ai_usage(
  target_user_id UUID,
  new_quota_limit INTEGER DEFAULT NULL,
  new_current_usage INTEGER DEFAULT NULL,
  admin_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  admin_role TEXT;
  action_description TEXT := '';
BEGIN
  -- Check if the admin user has admin role
  SELECT role INTO admin_role 
  FROM public.profiles 
  WHERE user_id = admin_user_id;
  
  IF admin_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Only admins can edit AI usage';
  END IF;
  
  -- Build action description for logging
  IF new_quota_limit IS NOT NULL AND new_current_usage IS NOT NULL THEN
    action_description := 'Admin set quota limit to ' || new_quota_limit || ' and current usage to ' || new_current_usage;
  ELSIF new_quota_limit IS NOT NULL THEN
    action_description := 'Admin set quota limit to ' || new_quota_limit;
  ELSIF new_current_usage IS NOT NULL THEN
    action_description := 'Admin set current usage to ' || new_current_usage;
  ELSE
    RAISE EXCEPTION 'At least one parameter (new_quota_limit or new_current_usage) must be provided';
  END IF;
  
  -- Update the user's billing record
  UPDATE public.user_billing 
  SET 
    ai_quota_limit = COALESCE(new_quota_limit, ai_quota_limit),
    ai_usage_current = COALESCE(new_current_usage, ai_usage_current),
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
      COALESCE(new_current_usage, 0),
      COALESCE(new_quota_limit, 50),
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
    'ai_usage_edited',
    action_description
  );
  
  RETURN TRUE;
END;
$$;

-- Grant execute permissions to authenticated users (function handles admin check internally)
GRANT EXECUTE ON FUNCTION public.admin_edit_ai_usage(UUID, INTEGER, INTEGER, UUID) TO authenticated;