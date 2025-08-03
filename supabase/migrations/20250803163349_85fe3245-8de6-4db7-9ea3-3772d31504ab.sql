-- Fix profile data for beatenyouog@gmail.com - set to admin role instead since constraint prevents 'pro'
UPDATE public.profiles 
SET 
  role = 'admin',
  role_enum = 'admin',
  is_pro = true,
  permissions = ARRAY['user', 'pro', 'admin'],
  subscription_status = 'active',
  updated_at = now()
WHERE user_id = '29c32282-cfff-46d7-9a95-53314d335175';