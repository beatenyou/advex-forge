-- Add unique constraint to billing_plans name column
ALTER TABLE public.billing_plans ADD CONSTRAINT billing_plans_name_unique UNIQUE (name);

-- Insert default billing plans with proper handling
INSERT INTO public.billing_plans (name, description, price_monthly, ai_quota_monthly, is_active) 
VALUES 
  ('Free', 'Basic access with limited AI interactions', 0, 50, true),
  ('Pro', 'Enhanced features with increased AI quota', 19.99, 500, true),
  ('Enterprise', 'Full access with unlimited AI interactions', 49.99, 10000, true)
ON CONFLICT (name) DO UPDATE SET
  ai_quota_monthly = EXCLUDED.ai_quota_monthly,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly;

-- Create AI usage tracking function
CREATE OR REPLACE FUNCTION public.check_ai_quota(user_id_param UUID)
RETURNS TABLE(
  can_use_ai BOOLEAN,
  current_usage INTEGER,
  quota_limit INTEGER,
  plan_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  billing_record RECORD;
BEGIN
  -- Get user billing info with plan details
  SELECT 
    ub.ai_usage_current,
    ub.ai_quota_limit,
    COALESCE(bp.name, 'Free') as plan_name,
    COALESCE(bp.ai_quota_monthly, 50) as monthly_quota
  INTO billing_record
  FROM public.user_billing ub
  LEFT JOIN public.billing_plans bp ON ub.plan_id = bp.id
  WHERE ub.user_id = user_id_param;
  
  -- If no billing record exists, create one with Free plan
  IF billing_record IS NULL THEN
    INSERT INTO public.user_billing (
      user_id, 
      ai_usage_current, 
      ai_quota_limit,
      subscription_status
    ) VALUES (
      user_id_param, 
      0, 
      50,
      'free'
    );
    
    billing_record.ai_usage_current := 0;
    billing_record.ai_quota_limit := 50;
    billing_record.plan_name := 'Free';
  END IF;
  
  -- Return quota check results
  RETURN QUERY SELECT 
    (billing_record.ai_usage_current < billing_record.ai_quota_limit) as can_use_ai,
    billing_record.ai_usage_current as current_usage,
    billing_record.ai_quota_limit as quota_limit,
    billing_record.plan_name as plan_name;
END;
$$;

-- Create function to increment AI usage
CREATE OR REPLACE FUNCTION public.increment_ai_usage(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  quota_check RECORD;
BEGIN
  -- Check current quota
  SELECT * INTO quota_check FROM public.check_ai_quota(user_id_param);
  
  -- If quota exceeded, return false
  IF NOT quota_check.can_use_ai THEN
    RETURN FALSE;
  END IF;
  
  -- Increment usage
  UPDATE public.user_billing 
  SET 
    ai_usage_current = ai_usage_current + 1,
    updated_at = NOW()
  WHERE user_id = user_id_param;
  
  -- Insert AI interaction record
  INSERT INTO public.ai_interactions (
    user_id,
    success,
    created_at
  ) VALUES (
    user_id_param,
    TRUE,
    NOW()
  );
  
  RETURN TRUE;
END;
$$;