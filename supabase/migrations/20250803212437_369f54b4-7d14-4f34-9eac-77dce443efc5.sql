-- Add the missing "Initial Access" phase and update "C2" to "Command and Control"
INSERT INTO public.navigation_phases (name, label, icon, order_index, is_active, description)
VALUES ('initial_access', 'Initial Access', 'Key', 2, true, 'Initial Access techniques for gaining entry to systems')
ON CONFLICT (name) DO NOTHING;

-- Update the existing C2 phase to show "Command and Control" instead of "C2"
UPDATE public.navigation_phases 
SET label = 'Command and Control'
WHERE name = 'c2' AND label = 'C2';

-- Adjust order_index for phases after Initial Access to make room
UPDATE public.navigation_phases 
SET order_index = order_index + 1
WHERE order_index >= 2 AND name != 'initial_access';