-- Fix data inconsistency: Update ai_chat_config to use the correct active provider ID
UPDATE ai_chat_config 
SET 
  default_user_primary_model_id = '5b8ed312-286b-44d5-abc8-1b6dacf6bd0c',
  default_user_secondary_model_id = '5b8ed312-286b-44d5-abc8-1b6dacf6bd0c'
WHERE default_user_primary_model_id = '76fae55a-4aa1-4e00-88b4-894bd7d3bb90';

-- Update all user_model_access records to point to the correct provider
UPDATE user_model_access 
SET provider_id = '5b8ed312-286b-44d5-abc8-1b6dacf6bd0c'
WHERE provider_id = '76fae55a-4aa1-4e00-88b4-894bd7d3bb90';