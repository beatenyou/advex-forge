-- Add mitre_id column to techniques table
ALTER TABLE public.techniques 
ADD COLUMN mitre_id text;

-- Add unique constraint on mitre_id to prevent duplicates
ALTER TABLE public.techniques 
ADD CONSTRAINT techniques_mitre_id_unique UNIQUE (mitre_id);

-- Create index for better performance
CREATE INDEX idx_techniques_mitre_id ON public.techniques(mitre_id);