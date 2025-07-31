-- Grant access to the Mistral model the user selected
INSERT INTO user_model_access (
  user_id,
  provider_id,
  granted_by,
  is_enabled,
  usage_limit,
  usage_current
) VALUES (
  '29c32282-cfff-46d7-9a95-53314d335175',
  '76fae55a-4aa1-4e00-88b4-894bd7d3bb90',
  NULL,
  true,
  NULL, -- unlimited
  0
) ON CONFLICT (user_id, provider_id) 
DO UPDATE SET
  is_enabled = true;