-- Update subscription plans and prepare for Stripe integration

-- First, add Stripe-related columns to billing_plans if they don't exist
ALTER TABLE public.billing_plans 
ADD COLUMN IF NOT EXISTS stripe_product_id text,
ADD COLUMN IF NOT EXISTS stripe_price_id text;

-- Update Free plan to 20 AI interactions
UPDATE public.billing_plans 
SET 
  ai_quota_monthly = 20,
  description = 'Perfect for getting started with AI assistance'
WHERE name = 'Free';

-- Update Pro plan to $6.99/month with 150 AI interactions
UPDATE public.billing_plans 
SET 
  price_monthly = 6.99,
  ai_quota_monthly = 150,
  description = 'Ideal for regular AI usage with more interactions'
WHERE name = 'Pro';

-- Deactivate Enterprise plan (don't delete to preserve referential integrity)
UPDATE public.billing_plans 
SET is_active = false
WHERE name = 'Enterprise';

-- Insert updated plans if they don't exist (upsert logic)
INSERT INTO public.billing_plans (name, description, price_monthly, ai_quota_monthly, features, is_active)
VALUES 
  ('Free', 'Perfect for getting started with AI assistance', 0, 20, '["20 AI interactions per month", "Basic support", "Access to core features"]'::jsonb, true),
  ('Pro', 'Ideal for regular AI usage with more interactions', 6.99, 150, '["150 AI interactions per month", "Priority support", "Advanced features", "Export capabilities"]'::jsonb, true)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  ai_quota_monthly = EXCLUDED.ai_quota_monthly,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active;

-- Update existing users' AI quotas based on their current plans
-- Users on Free plan get updated to 20 interactions (down from 50)
UPDATE public.user_billing 
SET ai_quota_limit = 20
WHERE plan_id IN (SELECT id FROM billing_plans WHERE name = 'Free');

-- Users on Pro plan get updated to 150 interactions (down from 500)  
UPDATE public.user_billing 
SET ai_quota_limit = 150
WHERE plan_id IN (SELECT id FROM billing_plans WHERE name = 'Pro');

-- Users on Enterprise plan keep their current quota until they change plans
-- No changes needed for Enterprise users

-- Ensure all users without billing records get the Free plan with 20 interactions
INSERT INTO public.user_billing (user_id, plan_id, ai_usage_current, ai_quota_limit, subscription_status)
SELECT 
  p.user_id,
  bp.id,
  0,
  20,
  'free'
FROM public.profiles p
LEFT JOIN public.user_billing ub ON p.user_id = ub.user_id
CROSS JOIN (SELECT id FROM public.billing_plans WHERE name = 'Free' LIMIT 1) bp
WHERE ub.user_id IS NULL;

-- Add indexes for better performance on Stripe-related queries
CREATE INDEX IF NOT EXISTS idx_billing_plans_stripe_product_id ON public.billing_plans(stripe_product_id);
CREATE INDEX IF NOT EXISTS idx_billing_plans_stripe_price_id ON public.billing_plans(stripe_price_id);
CREATE INDEX IF NOT EXISTS idx_user_billing_stripe_customer_id ON public.user_billing(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_billing_stripe_subscription_id ON public.user_billing(stripe_subscription_id);