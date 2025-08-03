-- Clean up legacy phase data in techniques table
-- Update techniques to use only current navigation phase names

-- First, let's update the main phase field for legacy values
UPDATE techniques 
SET phase = CASE 
  WHEN phase = 'Initial Access' THEN 'Establish Foothold'
  WHEN phase = 'Reconnaissance' THEN 'Active Reconnaissance'
  WHEN phase = 'Discovery' THEN 'Enumeration'
  WHEN phase = 'Command and Control' THEN 'C2'
  WHEN phase = 'Credential Access' THEN 'Privilege Escalation'
  ELSE phase
END
WHERE phase IN ('Initial Access', 'Reconnaissance', 'Discovery', 'Command and Control', 'Credential Access');

-- Update the phases array field for legacy values
UPDATE techniques 
SET phases = ARRAY(
  SELECT CASE 
    WHEN phase_elem = 'Initial Access' THEN 'Establish Foothold'
    WHEN phase_elem = 'Reconnaissance' THEN 'Active Reconnaissance'
    WHEN phase_elem = 'Discovery' THEN 'Enumeration'
    WHEN phase_elem = 'Command and Control' THEN 'C2'
    WHEN phase_elem = 'Credential Access' THEN 'Privilege Escalation'
    ELSE phase_elem
  END
  FROM unnest(phases) AS phase_elem
)
WHERE phases && ARRAY['Initial Access', 'Reconnaissance', 'Discovery', 'Command and Control', 'Credential Access'];

-- Remove any NULL or empty phases
UPDATE techniques 
SET phases = ARRAY(
  SELECT phase_elem 
  FROM unnest(phases) AS phase_elem 
  WHERE phase_elem IS NOT NULL AND trim(phase_elem) != ''
)
WHERE phases IS NOT NULL;