-- Create test data for model usage tracking

-- First, let's ensure we have proper user_model_access records for testing
INSERT INTO user_model_access (
  user_id, 
  provider_id, 
  granted_by, 
  is_enabled, 
  usage_limit, 
  usage_current
) VALUES 
-- User 1 with Mistral Agent access
('29c32282-cfff-46d7-9a95-53314d335175', '5b8ed312-286b-44d5-abc8-1b6dacf6bd0c', NULL, true, NULL, 5),
-- User 1 with OpenAI access  
('29c32282-cfff-46d7-9a95-53314d335175', 'e5afccfd-2554-416f-9d7b-4d3704d3b95b', NULL, true, NULL, 3),
-- User 2 with Mistral access
('896585cd-cd12-4807-9d6c-d35ac1adb81a', '76fae55a-4aa1-4e00-88b4-894bd7d3bb90', NULL, true, NULL, 2)
ON CONFLICT (user_id, provider_id) 
DO UPDATE SET
  usage_current = EXCLUDED.usage_current;

-- Create corresponding analytics records
INSERT INTO model_usage_analytics (
  user_id,
  provider_id,
  session_id,
  tokens_used,
  response_time_ms,
  success,
  created_at
) VALUES 
-- Usage records for User 1 with Mistral Agent
('29c32282-cfff-46d7-9a95-53314d335175', '5b8ed312-286b-44d5-abc8-1b6dacf6bd0c', gen_random_uuid(), 150, 1200, true, NOW() - INTERVAL '1 hour'),
('29c32282-cfff-46d7-9a95-53314d335175', '5b8ed312-286b-44d5-abc8-1b6dacf6bd0c', gen_random_uuid(), 200, 1450, true, NOW() - INTERVAL '2 hours'),
('29c32282-cfff-46d7-9a95-53314d335175', '5b8ed312-286b-44d5-abc8-1b6dacf6bd0c', gen_random_uuid(), 180, 1100, true, NOW() - INTERVAL '3 hours'),
('29c32282-cfff-46d7-9a95-53314d335175', '5b8ed312-286b-44d5-abc8-1b6dacf6bd0c', gen_random_uuid(), 220, 1600, true, NOW() - INTERVAL '4 hours'),
('29c32282-cfff-46d7-9a95-53314d335175', '5b8ed312-286b-44d5-abc8-1b6dacf6bd0c', gen_random_uuid(), 190, 1300, true, NOW() - INTERVAL '5 hours'),
-- Usage records for User 1 with OpenAI
('29c32282-cfff-46d7-9a95-53314d335175', 'e5afccfd-2554-416f-9d7b-4d3704d3b95b', gen_random_uuid(), 120, 800, true, NOW() - INTERVAL '6 hours'),
('29c32282-cfff-46d7-9a95-53314d335175', 'e5afccfd-2554-416f-9d7b-4d3704d3b95b', gen_random_uuid(), 140, 900, true, NOW() - INTERVAL '7 hours'),
('29c32282-cfff-46d7-9a95-53314d335175', 'e5afccfd-2554-416f-9d7b-4d3704d3b95b', gen_random_uuid(), 130, 850, true, NOW() - INTERVAL '8 hours'),
-- Usage records for User 2 with Mistral
('896585cd-cd12-4807-9d6c-d35ac1adb81a', '76fae55a-4aa1-4e00-88b4-894bd7d3bb90', gen_random_uuid(), 160, 1400, true, NOW() - INTERVAL '2 hours'),
('896585cd-cd12-4807-9d6c-d35ac1adb81a', '76fae55a-4aa1-4e00-88b4-894bd7d3bb90', gen_random_uuid(), 170, 1350, true, NOW() - INTERVAL '3 hours');

-- Test the increment_model_usage function
SELECT increment_model_usage(
  '29c32282-cfff-46d7-9a95-53314d335175',
  '5b8ed312-286b-44d5-abc8-1b6dacf6bd0c',
  100,
  1500,
  gen_random_uuid()
) AS test_increment_result;