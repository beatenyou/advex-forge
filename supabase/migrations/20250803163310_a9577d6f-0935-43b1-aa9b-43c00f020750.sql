-- Fix profile data for beatenyouog@gmail.com
UPDATE public.profiles 
SET 
  role = 'pro',
  role_enum = 'pro',
  is_pro = true,
  permissions = ARRAY['user', 'pro'],
  subscription_status = 'active',
  updated_at = now()
WHERE user_id = '29c32282-cfff-46d7-9a95-53314d335175';