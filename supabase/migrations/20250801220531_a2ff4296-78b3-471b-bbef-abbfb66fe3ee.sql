-- Create admin_notes table for admin communication and record keeping
CREATE TABLE public.admin_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID NOT NULL,
  assigned_to UUID,
  support_ticket_id TEXT,
  tags TEXT[] DEFAULT '{}',
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Add check constraints for valid values
  CONSTRAINT valid_category CHECK (category IN ('Issues', 'Support Tickets', 'Information Requests', 'System Updates', 'General')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'resolved', 'archived'))
);

-- Enable Row Level Security
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access only
CREATE POLICY "Only admins can view admin notes" 
ON public.admin_notes 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

CREATE POLICY "Only admins can create admin notes" 
ON public.admin_notes 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

CREATE POLICY "Only admins can update admin notes" 
ON public.admin_notes 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

CREATE POLICY "Only admins can delete admin notes" 
ON public.admin_notes 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_admin_notes_updated_at
BEFORE UPDATE ON public.admin_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_admin_notes_category ON public.admin_notes(category);
CREATE INDEX idx_admin_notes_priority ON public.admin_notes(priority);
CREATE INDEX idx_admin_notes_status ON public.admin_notes(status);
CREATE INDEX idx_admin_notes_created_by ON public.admin_notes(created_by);
CREATE INDEX idx_admin_notes_assigned_to ON public.admin_notes(assigned_to);
CREATE INDEX idx_admin_notes_created_at ON public.admin_notes(created_at);
CREATE INDEX idx_admin_notes_due_date ON public.admin_notes(due_date);