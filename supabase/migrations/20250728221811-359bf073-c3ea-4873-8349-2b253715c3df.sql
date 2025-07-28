-- Update beatenyouog@gmail.com to be an admin
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'beatenyouog@gmail.com';

-- Create an enum for app roles to ensure data consistency
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE app_role AS ENUM ('admin', 'user');
    END IF;
END $$;

-- Update the profiles table to use the enum (if needed)
-- This will help ensure role consistency