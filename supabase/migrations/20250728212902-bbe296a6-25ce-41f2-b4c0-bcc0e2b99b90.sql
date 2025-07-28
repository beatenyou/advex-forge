-- Create scenarios table for managing attack scenarios
CREATE TABLE public.scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  phase TEXT NOT NULL DEFAULT 'Reconnaissance',
  linked_techniques TEXT[] DEFAULT '{}',
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable Row Level Security
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;

-- Create policies for scenarios
CREATE POLICY "Scenarios are viewable by everyone" 
ON public.scenarios 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert scenarios" 
ON public.scenarios 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update scenarios" 
ON public.scenarios 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete scenarios" 
ON public.scenarios 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_scenarios_updated_at
BEFORE UPDATE ON public.scenarios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default scenarios
INSERT INTO public.scenarios (title, description, phase, tags, linked_techniques, order_index) VALUES
('Network Reconnaissance', 'Gathering information about target networks and systems', 'Reconnaissance', ARRAY['network', 'scanning', 'enumeration'], ARRAY['Network Scanning', 'Port Scanning', 'Service Enumeration'], 1),
('Web Application Testing', 'Identifying vulnerabilities in web applications', 'Initial Access', ARRAY['web', 'application', 'testing'], ARRAY['SQL Injection', 'XSS', 'Directory Traversal'], 2),
('Privilege Escalation', 'Gaining higher-level permissions on compromised systems', 'Privilege Escalation', ARRAY['escalation', 'permissions', 'exploit'], ARRAY['Local Privilege Escalation', 'Kernel Exploits'], 3),
('Lateral Movement', 'Moving through the network to access additional systems', 'Lateral Movement', ARRAY['movement', 'network', 'pivoting'], ARRAY['Pass the Hash', 'Remote Desktop Protocol'], 4),
('Data Exfiltration', 'Extracting sensitive data from target systems', 'Exfiltration', ARRAY['data', 'extraction', 'steganography'], ARRAY['Data Compression', 'Encrypted Channel'], 5);