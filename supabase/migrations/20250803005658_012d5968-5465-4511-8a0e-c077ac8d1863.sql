-- Update techniques to use navigation phase names instead of labels
UPDATE techniques 
SET phase = CASE 
  WHEN phase = 'Active Reconnaissance' THEN 'recon'
  WHEN phase = 'Establish Foothold' THEN 'foothold'
  WHEN phase = 'Enumeration' THEN 'enum'
  WHEN phase = 'User Persistence' THEN 'user_persistence'
  WHEN phase = 'Privilege Escalation' THEN 'pe'
  WHEN phase = 'System Persistence' THEN 'system_persistence'
  WHEN phase = 'Collection' THEN 'collection'
  WHEN phase = 'Remote Enumeration' THEN 'remote_enum'
  WHEN phase = 'Lateral Movement' THEN 'lateral_mvmnt'
  WHEN phase = 'C2' THEN 'c2'
  WHEN phase = 'Effects' THEN 'effects'
  ELSE phase
END
WHERE phase IN ('Active Reconnaissance', 'Establish Foothold', 'Enumeration', 'User Persistence', 'Privilege Escalation', 'System Persistence', 'Collection', 'Remote Enumeration', 'Lateral Movement', 'C2', 'Effects');

-- Update phases array to use navigation phase names
UPDATE techniques 
SET phases = ARRAY(
  SELECT CASE 
    WHEN phase_elem = 'Active Reconnaissance' THEN 'recon'
    WHEN phase_elem = 'Establish Foothold' THEN 'foothold'
    WHEN phase_elem = 'Enumeration' THEN 'enum'
    WHEN phase_elem = 'User Persistence' THEN 'user_persistence'
    WHEN phase_elem = 'Privilege Escalation' THEN 'pe'
    WHEN phase_elem = 'System Persistence' THEN 'system_persistence'
    WHEN phase_elem = 'Collection' THEN 'collection'
    WHEN phase_elem = 'Remote Enumeration' THEN 'remote_enum'
    WHEN phase_elem = 'Lateral Movement' THEN 'lateral_mvmnt'
    WHEN phase_elem = 'C2' THEN 'c2'
    WHEN phase_elem = 'Effects' THEN 'effects'
    ELSE phase_elem
  END
  FROM unnest(phases) AS phase_elem
  WHERE phase_elem IS NOT NULL AND trim(phase_elem) != ''
)
WHERE phases && ARRAY['Active Reconnaissance', 'Establish Foothold', 'Enumeration', 'User Persistence', 'Privilege Escalation', 'System Persistence', 'Collection', 'Remote Enumeration', 'Lateral Movement', 'C2', 'Effects'];