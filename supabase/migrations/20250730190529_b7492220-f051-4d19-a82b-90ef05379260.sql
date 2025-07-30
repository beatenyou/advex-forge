-- Add database indexes for better performance on user_id columns
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_saved_prompts_user_id ON public.saved_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_billing_user_id ON public.user_billing(user_id);

-- Add composite index for efficient session queries
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_active ON public.chat_sessions(user_id, is_active, updated_at DESC);

-- Add audit logging table for session activities
CREATE TABLE IF NOT EXISTS public.session_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID,
  action TEXT NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.session_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for audit log
CREATE POLICY "Admins can view all session audit logs" 
ON public.session_audit_log 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

CREATE POLICY "Users can view their own session audit logs" 
ON public.session_audit_log 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert session audit logs" 
ON public.session_audit_log 
FOR INSERT 
WITH CHECK (true);

-- Add function to log session activities
CREATE OR REPLACE FUNCTION public.log_session_activity(
  p_user_id UUID,
  p_session_id UUID,
  p_action TEXT,
  p_details JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.session_audit_log (
    user_id,
    session_id,
    action,
    details,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_session_id,
    p_action,
    p_details,
    p_ip_address,
    p_user_agent
  );
END;
$$;