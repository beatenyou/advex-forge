-- Create site_maintenance table
CREATE TABLE public.site_maintenance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  maintenance_title TEXT NOT NULL DEFAULT 'Site Under Maintenance',
  maintenance_message TEXT NOT NULL DEFAULT 'We are currently performing scheduled maintenance to improve your experience. Please check back shortly.',
  estimated_completion TIMESTAMP WITH TIME ZONE NULL,
  contact_info TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NULL
);

-- Enable Row Level Security
ALTER TABLE public.site_maintenance ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage maintenance settings" 
ON public.site_maintenance 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "All users can view active maintenance info" 
ON public.site_maintenance 
FOR SELECT 
USING (is_enabled = true);

-- Create trigger for updated_at
CREATE TRIGGER update_site_maintenance_updated_at
BEFORE UPDATE ON public.site_maintenance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default maintenance record
INSERT INTO public.site_maintenance (
  is_enabled, 
  maintenance_title, 
  maintenance_message
) VALUES (
  false,
  'Site Under Maintenance',
  'We are currently performing scheduled maintenance to improve your experience. Please check back shortly.'
);