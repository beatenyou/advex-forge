-- Create user preferences table
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  phone TEXT,
  address TEXT,
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',
  email_notifications BOOLEAN DEFAULT true,
  app_notifications BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  data_sharing BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user activity log table
CREATE TABLE public.user_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create saved prompts table
CREATE TABLE public.saved_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  tags TEXT[],
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create billing plans table
CREATE TABLE public.billing_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL,
  price_yearly DECIMAL,
  features JSONB DEFAULT '[]',
  ai_quota_monthly INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user billing table
CREATE TABLE public.user_billing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID,
  subscription_status TEXT DEFAULT 'free',
  billing_cycle TEXT DEFAULT 'monthly',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  ai_usage_current INTEGER DEFAULT 0,
  ai_quota_limit INTEGER DEFAULT 1000,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create FAQ items table
CREATE TABLE public.faq_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create support tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  category TEXT DEFAULT 'general',
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create support ticket messages table
CREATE TABLE public.support_ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  message_text TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_preferences
CREATE POLICY "Users can view their own preferences" 
ON public.user_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" 
ON public.user_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
ON public.user_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for user_activity_log
CREATE POLICY "Users can view their own activity log" 
ON public.user_activity_log 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity log" 
ON public.user_activity_log 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all activity logs" 
ON public.user_activity_log 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

-- Create RLS policies for saved_prompts
CREATE POLICY "Users can manage their own saved prompts" 
ON public.saved_prompts 
FOR ALL 
USING (auth.uid() = user_id);

-- Create RLS policies for billing_plans
CREATE POLICY "Billing plans are viewable by everyone" 
ON public.billing_plans 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage billing plans" 
ON public.billing_plans 
FOR ALL 
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

-- Create RLS policies for user_billing
CREATE POLICY "Users can view their own billing" 
ON public.user_billing 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own billing" 
ON public.user_billing 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert billing records" 
ON public.user_billing 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all billing" 
ON public.user_billing 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

-- Create RLS policies for faq_items
CREATE POLICY "FAQ items are viewable by everyone" 
ON public.faq_items 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage FAQ items" 
ON public.faq_items 
FOR ALL 
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

-- Create RLS policies for support_tickets
CREATE POLICY "Users can view their own support tickets" 
ON public.support_tickets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create support tickets" 
ON public.support_tickets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own support tickets" 
ON public.support_tickets 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all support tickets" 
ON public.support_tickets 
FOR ALL 
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

-- Create RLS policies for support_ticket_messages
CREATE POLICY "Users can view messages in their tickets" 
ON public.support_ticket_messages 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = ticket_id AND support_tickets.user_id = auth.uid()));

CREATE POLICY "Users can send messages to their tickets" 
ON public.support_ticket_messages 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = ticket_id AND support_tickets.user_id = auth.uid()));

CREATE POLICY "Admins can manage all ticket messages" 
ON public.support_ticket_messages 
FOR ALL 
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

-- Create triggers for updated_at columns
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saved_prompts_updated_at
BEFORE UPDATE ON public.saved_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_billing_updated_at
BEFORE UPDATE ON public.user_billing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_faq_items_updated_at
BEFORE UPDATE ON public.faq_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default billing plans
INSERT INTO public.billing_plans (name, description, price_monthly, price_yearly, features, ai_quota_monthly) VALUES
('Free', 'Basic plan with limited features', 0, 0, '["Basic AI chat", "Limited prompts"]', 1000),
('Pro', 'Professional plan with advanced features', 19.99, 199.99, '["Unlimited AI chat", "Advanced prompts", "Priority support"]', 10000),
('Enterprise', 'Enterprise plan with all features', 99.99, 999.99, '["All Pro features", "Custom integrations", "Dedicated support"]', 100000);

-- Insert some default FAQ items
INSERT INTO public.faq_items (question, answer, category, order_index) VALUES
('How do I get started?', 'You can get started by signing up for an account and exploring our AI chat features.', 'Getting Started', 1),
('What are the pricing plans?', 'We offer Free, Pro, and Enterprise plans with different AI usage quotas and features.', 'Billing', 2),
('How do I contact support?', 'You can contact support through the Support tab in your preferences or create a support ticket.', 'Support', 3),
('Can I export my data?', 'Yes, you can export your data from the Privacy tab in your user preferences.', 'Privacy', 4);