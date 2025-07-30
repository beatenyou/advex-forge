-- Enhanced model access management and per-model quota tracking

-- Add additional columns to user_model_access for better tracking
ALTER TABLE user_model_access 
ADD COLUMN IF NOT EXISTS usage_limit INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS usage_current INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

-- Create model usage analytics table
CREATE TABLE IF NOT EXISTS model_usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  session_id UUID,
  tokens_used INTEGER DEFAULT 0,
  response_time_ms INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT true,
  error_type TEXT,
  cost_estimate DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on model_usage_analytics
ALTER TABLE model_usage_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for model_usage_analytics
CREATE POLICY "Users can view their own model usage analytics"
ON model_usage_analytics FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert model usage analytics"
ON model_usage_analytics FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all model usage analytics"
ON model_usage_analytics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create model access templates table for easier bulk management
CREATE TABLE IF NOT EXISTS model_access_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  model_ids UUID[] NOT NULL DEFAULT '{}',
  default_usage_limit INTEGER DEFAULT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on model_access_templates
ALTER TABLE model_access_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for model_access_templates
CREATE POLICY "Admins can manage model access templates"
ON model_access_templates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_model_usage_analytics_user_provider ON model_usage_analytics(user_id, provider_id);
CREATE INDEX IF NOT EXISTS idx_model_usage_analytics_created_at ON model_usage_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_user_model_access_user_provider ON user_model_access(user_id, provider_id);

-- Function to check model-specific quota
CREATE OR REPLACE FUNCTION check_model_quota(
  user_id_param UUID,
  provider_id_param UUID
)
RETURNS TABLE(
  can_use_model BOOLEAN,
  current_usage INTEGER,
  usage_limit INTEGER,
  provider_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  access_record RECORD;
  provider_record RECORD;
BEGIN
  -- Get provider info
  SELECT name INTO provider_record FROM ai_providers WHERE id = provider_id_param;
  
  -- Get user model access record
  SELECT * INTO access_record 
  FROM user_model_access 
  WHERE user_id = user_id_param 
  AND provider_id = provider_id_param 
  AND is_enabled = true;
  
  -- If no access record, deny access
  IF access_record IS NULL THEN
    RETURN QUERY SELECT 
      false as can_use_model,
      0 as current_usage,
      0 as usage_limit,
      COALESCE(provider_record.name, 'Unknown') as provider_name;
    RETURN;
  END IF;
  
  -- If no usage limit set, allow unlimited access
  IF access_record.usage_limit IS NULL THEN
    RETURN QUERY SELECT 
      true as can_use_model,
      access_record.usage_current as current_usage,
      -1 as usage_limit, -- -1 indicates unlimited
      COALESCE(provider_record.name, 'Unknown') as provider_name;
    RETURN;
  END IF;
  
  -- Check if quota exceeded
  RETURN QUERY SELECT 
    (access_record.usage_current < access_record.usage_limit) as can_use_model,
    access_record.usage_current as current_usage,
    access_record.usage_limit as usage_limit,
    COALESCE(provider_record.name, 'Unknown') as provider_name;
END;
$$;

-- Function to increment model-specific usage
CREATE OR REPLACE FUNCTION increment_model_usage(
  user_id_param UUID,
  provider_id_param UUID,
  tokens_used_param INTEGER DEFAULT 1,
  response_time_param INTEGER DEFAULT NULL,
  session_id_param UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  quota_check RECORD;
BEGIN
  -- Check current quota
  SELECT * INTO quota_check FROM check_model_quota(user_id_param, provider_id_param);
  
  -- If quota exceeded, return false
  IF NOT quota_check.can_use_model THEN
    RETURN FALSE;
  END IF;
  
  -- Increment usage in user_model_access
  UPDATE user_model_access 
  SET usage_current = usage_current + 1
  WHERE user_id = user_id_param 
  AND provider_id = provider_id_param;
  
  -- Insert analytics record
  INSERT INTO model_usage_analytics (
    user_id,
    provider_id,
    session_id,
    tokens_used,
    response_time_ms,
    success,
    created_at
  ) VALUES (
    user_id_param,
    provider_id_param,
    session_id_param,
    tokens_used_param,
    response_time_param,
    TRUE,
    NOW()
  );
  
  RETURN TRUE;
END;
$$;

-- Function for admins to grant model access with custom limits
CREATE OR REPLACE FUNCTION admin_grant_model_access(
  target_user_id UUID,
  provider_id_param UUID,
  admin_user_id UUID,
  usage_limit_param INTEGER DEFAULT NULL,
  expires_at_param TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  notes_param TEXT DEFAULT NULL
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
  FROM profiles 
  WHERE user_id = admin_user_id;
  
  IF admin_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Only admins can grant model access';
  END IF;
  
  -- Insert or update model access
  INSERT INTO user_model_access (
    user_id,
    provider_id,
    granted_by,
    is_enabled,
    usage_limit,
    usage_current,
    expires_at,
    notes,
    granted_at
  ) VALUES (
    target_user_id,
    provider_id_param,
    admin_user_id,
    true,
    usage_limit_param,
    0,
    expires_at_param,
    notes_param,
    NOW()
  ) ON CONFLICT (user_id, provider_id) 
  DO UPDATE SET
    granted_by = admin_user_id,
    is_enabled = true,
    usage_limit = usage_limit_param,
    expires_at = expires_at_param,
    notes = notes_param,
    granted_at = NOW();
  
  -- Log the action
  INSERT INTO user_activity_log (
    user_id,
    activity_type,
    description
  ) VALUES (
    target_user_id,
    'model_access_granted',
    'Admin granted access to model with custom limits'
  );
  
  RETURN TRUE;
END;
$$;

-- Add trigger to update updated_at on model_access_templates
CREATE TRIGGER update_model_access_templates_updated_at
BEFORE UPDATE ON model_access_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();