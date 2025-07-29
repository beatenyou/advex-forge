-- Add account locking fields to user_billing table
ALTER TABLE public.user_billing 
ADD COLUMN account_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN account_lock_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN account_lock_reason TEXT;