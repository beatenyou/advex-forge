-- Create navigation_phases table for dynamic navigation management
CREATE TABLE public.navigation_phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'Navigation',
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.navigation_phases ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Navigation phases are viewable by everyone" 
ON public.navigation_phases 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage navigation phases" 
ON public.navigation_phases 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Create trigger for updated_at
CREATE TRIGGER update_navigation_phases_updated_at
BEFORE UPDATE ON public.navigation_phases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default navigation phases based on current hardcoded values
INSERT INTO public.navigation_phases (name, label, description, icon, order_index) VALUES
('all', 'All Techniques', 'Browse all available techniques and tools', 'Grid3X3', 0),
('reconnaissance', 'Reconnaissance', 'Information gathering and target enumeration techniques', 'Search', 1),
('weaponization', 'Weaponization', 'Payload creation and delivery mechanisms', 'Zap', 2),
('delivery', 'Delivery', 'Attack vector delivery and initial access methods', 'Send', 3),
('exploitation', 'Exploitation', 'System and application exploitation techniques', 'Target', 4),
('installation', 'Installation', 'Persistence and backdoor installation methods', 'Download', 5),
('command-control', 'Command & Control', 'C2 infrastructure and communication channels', 'Radio', 6),
('actions-objectives', 'Actions on Objectives', 'Data exfiltration and objective completion', 'Flag', 7);

-- Create index for better performance
CREATE INDEX idx_navigation_phases_order ON public.navigation_phases(order_index);
CREATE INDEX idx_navigation_phases_active ON public.navigation_phases(is_active);