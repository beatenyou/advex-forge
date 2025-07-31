-- Create techniques table for storing cybersecurity techniques
CREATE TABLE public.techniques (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  phase TEXT NOT NULL DEFAULT 'Reconnaissance',
  tags TEXT[] NOT NULL DEFAULT '{}',
  tools TEXT[] NOT NULL DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'General',
  when_to_use TEXT[] NOT NULL DEFAULT '{}',
  how_to_use TEXT[] NOT NULL DEFAULT '{}',
  commands JSONB NOT NULL DEFAULT '[]',
  detection TEXT[] NOT NULL DEFAULT '{}',
  mitigation TEXT[] NOT NULL DEFAULT '{}',
  references JSONB NOT NULL DEFAULT '[]',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE public.techniques ENABLE ROW LEVEL SECURITY;

-- Create policies for technique access
CREATE POLICY "Techniques are viewable by everyone" 
ON public.techniques 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can insert techniques" 
ON public.techniques 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update techniques" 
ON public.techniques 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete techniques" 
ON public.techniques 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_techniques_updated_at
BEFORE UPDATE ON public.techniques
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create user_favorites table for technique favorites
CREATE TABLE public.user_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  technique_id UUID NOT NULL REFERENCES public.techniques(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, technique_id)
);

-- Enable RLS for user_favorites
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- Create policies for user favorites
CREATE POLICY "Users can view their own favorites" 
ON public.user_favorites 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites" 
ON public.user_favorites 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" 
ON public.user_favorites 
FOR DELETE 
USING (auth.uid() = user_id);

-- Enable realtime for techniques table
ALTER TABLE public.techniques REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.techniques;

-- Enable realtime for user_favorites table
ALTER TABLE public.user_favorites REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_favorites;