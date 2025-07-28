-- Create AI providers table
CREATE TABLE public.ai_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('openai', 'mistral')),
  api_key_secret_name TEXT NOT NULL,
  base_url TEXT,
  model_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create AI chat configuration table
CREATE TABLE public.ai_chat_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  default_provider_id UUID REFERENCES ai_providers(id),
  system_prompt TEXT DEFAULT 'You are a helpful AI assistant. Provide clear, concise, and accurate responses.',
  max_tokens INTEGER DEFAULT 1000,
  temperature DECIMAL(3,2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for AI providers
CREATE POLICY "AI providers are viewable by everyone"
ON public.ai_providers
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert AI providers"
ON public.ai_providers
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins can update AI providers"
ON public.ai_providers
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins can delete AI providers"
ON public.ai_providers
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- RLS policies for AI chat config
CREATE POLICY "AI chat config is viewable by everyone"
ON public.ai_chat_config
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert AI chat config"
ON public.ai_chat_config
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins can update AI chat config"
ON public.ai_chat_config
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Create updated_at triggers
CREATE TRIGGER update_ai_providers_updated_at
  BEFORE UPDATE ON public.ai_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_chat_config_updated_at
  BEFORE UPDATE ON public.ai_chat_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default configuration
INSERT INTO public.ai_chat_config (is_enabled) VALUES (true);