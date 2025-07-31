-- Add unique constraint to user_id in user_billing table
ALTER TABLE public.user_billing 
ADD CONSTRAINT user_billing_user_id_unique UNIQUE (user_id);