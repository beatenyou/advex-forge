-- Create attack_plans table for Pro users
CREATE TABLE public.attack_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Attack Plan',
  description TEXT,
  plan_data JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attack_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own attack plans" 
ON public.attack_plans 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own attack plans" 
ON public.attack_plans 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attack plans" 
ON public.attack_plans 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attack plans" 
ON public.attack_plans 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_attack_plans_updated_at
BEFORE UPDATE ON public.attack_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();