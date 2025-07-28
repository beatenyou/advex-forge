-- Create cheat_sheets table
CREATE TABLE public.cheat_sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  bg_color TEXT NOT NULL DEFAULT 'bg-gradient-to-br from-cyber-blue/5 to-cyber-blue/10',
  commands JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.cheat_sheets ENABLE ROW LEVEL SECURITY;

-- Create policies for cheat_sheets
CREATE POLICY "Cheat sheets are viewable by everyone" 
ON public.cheat_sheets 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert cheat sheets" 
ON public.cheat_sheets 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins can update cheat sheets" 
ON public.cheat_sheets 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins can delete cheat sheets" 
ON public.cheat_sheets 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_cheat_sheets_updated_at
BEFORE UPDATE ON public.cheat_sheets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert existing cheat sheet data
INSERT INTO public.cheat_sheets (title, description, category, bg_color, commands) VALUES 
(
  'PowerView Quick Reference',
  'Essential PowerView commands for Active Directory enumeration',
  'Active Directory',
  'bg-gradient-to-br from-cyber-blue/5 to-cyber-blue/10',
  '[
    {"command": "Get-NetDomain", "description": "Current domain info", "category": "Domain Info"},
    {"command": "Get-NetUser", "description": "All domain users", "category": "User Enum"},
    {"command": "Get-NetGroup *admin*", "description": "Admin groups", "category": "Group Enum"},
    {"command": "Get-NetComputer", "description": "All computers", "category": "Computer Enum"},
    {"command": "Invoke-UserHunter", "description": "Find user sessions", "category": "Session Hunt"},
    {"command": "Get-NetShare", "description": "Network shares", "category": "Share Enum"},
    {"command": "Get-NetGPO", "description": "Group policies", "category": "GPO Enum"}
  ]'::jsonb
),
(
  'Impacket Tools',
  'Python toolkit for working with network protocols',
  'Network Tools',
  'bg-gradient-to-br from-cyber-purple/5 to-cyber-purple/10',
  '[
    {"command": "GetUserSPNs.py", "description": "Kerberoasting", "category": "Credential Access"},
    {"command": "GetNPUsers.py", "description": "AS-REP roasting", "category": "Credential Access"},
    {"command": "secretsdump.py", "description": "Extract secrets", "category": "Credential Dump"},
    {"command": "psexec.py", "description": "Remote execution", "category": "Lateral Movement"},
    {"command": "smbexec.py", "description": "SMB-based execution", "category": "Execution"},
    {"command": "wmiexec.py", "description": "WMI-based execution", "category": "Execution"}
  ]'::jsonb
);