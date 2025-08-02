-- Add phases column to techniques table
ALTER TABLE public.techniques 
ADD COLUMN phases TEXT[] DEFAULT NULL;

-- Migrate existing phase data to phases array
UPDATE public.techniques 
SET phases = ARRAY[phase] 
WHERE phase IS NOT NULL AND phase != '';

-- Update any null phases to have a default value
UPDATE public.techniques 
SET phases = ARRAY['Reconnaissance'] 
WHERE phases IS NULL OR phases = '{}';

-- Add index for better performance on phases queries
CREATE INDEX idx_techniques_phases ON public.techniques USING GIN(phases);