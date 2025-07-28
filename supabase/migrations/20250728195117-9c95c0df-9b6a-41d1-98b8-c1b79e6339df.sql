-- Create ai_link_tabs table for managing link tabs in the AI section
CREATE TABLE public.ai_link_tabs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  icon TEXT NOT NULL DEFAULT 'ExternalLink',
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_link_tabs ENABLE ROW LEVEL SECURITY;

-- Create policies for ai_link_tabs
CREATE POLICY "AI link tabs are viewable by everyone" 
ON public.ai_link_tabs 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert AI link tabs" 
ON public.ai_link_tabs 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins can update AI link tabs" 
ON public.ai_link_tabs 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins can delete AI link tabs" 
ON public.ai_link_tabs 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ai_link_tabs_updated_at
BEFORE UPDATE ON public.ai_link_tabs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default link tabs
INSERT INTO public.ai_link_tabs (title, url, description, category, icon, order_index) VALUES
('MITRE ATT&CK', 'https://attack.mitre.org/', 'Comprehensive matrix of attack techniques', 'Resources', 'Shield', 1),
('PowerSploit', 'https://github.com/PowerShellMafia/PowerSploit', 'PowerShell penetration testing framework', 'Tools', 'Terminal', 2),
('BloodHound', 'https://github.com/BloodHoundAD/BloodHound', 'Active Directory attack path analysis', 'Tools', 'GitBranch', 3),
('AD Security', 'https://adsecurity.org/', 'Active Directory security research', 'Resources', 'BookOpen', 4);