-- Update Pro plan yearly price from $199.99 to $70
UPDATE billing_plans 
SET price_yearly = 70.00 
WHERE name = 'Pro' AND is_active = true;