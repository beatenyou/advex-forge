-- Create user plan audit table for tracking plan changes
CREATE TABLE public.user_plan_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  admin_user_id UUID NOT NULL,
  old_plan_id UUID,
  new_plan_id UUID,
  action_type TEXT NOT NULL CHECK (action_type IN ('assigned', 'removed', 'changed')),
  old_plan_name TEXT,
  new_plan_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_plan_audit ENABLE ROW LEVEL SECURITY;

-- Create policies for user plan audit
CREATE POLICY "Admins can view all plan audit logs" 
ON public.user_plan_audit 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

CREATE POLICY "System can insert plan audit logs" 
ON public.user_plan_audit 
FOR INSERT 
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_user_plan_audit_user_id ON public.user_plan_audit(user_id);
CREATE INDEX idx_user_plan_audit_created_at ON public.user_plan_audit(created_at DESC);