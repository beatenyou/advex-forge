-- Ensure there is an admin user for testing
-- First, create an admin profile if none exists (for testing purposes)
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Check if there are any admin users
    SELECT user_id INTO admin_user_id FROM public.profiles WHERE role = 'admin' LIMIT 1;
    
    -- If no admin exists, create one using the first available user
    IF admin_user_id IS NULL THEN
        -- Get the first user from auth.users if any exist
        SELECT id INTO admin_user_id FROM auth.users LIMIT 1;
        
        IF admin_user_id IS NOT NULL THEN
            -- Update or insert admin profile
            INSERT INTO public.profiles (user_id, email, display_name, role)
            VALUES (admin_user_id, 'admin@example.com', 'Admin User', 'admin')
            ON CONFLICT (user_id) 
            DO UPDATE SET role = 'admin';
            
            RAISE NOTICE 'Made user % an admin', admin_user_id;
        ELSE
            RAISE NOTICE 'No users found in auth.users table';
        END IF;
    ELSE
        RAISE NOTICE 'Admin user already exists: %', admin_user_id;
    END IF;
END $$;