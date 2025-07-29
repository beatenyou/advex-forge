-- Fix user_sessions table to allow null user_id for anonymous sessions
ALTER TABLE public.user_sessions ALTER COLUMN user_id DROP NOT NULL;

-- Manually run calculate_daily_stats for the last 7 days to populate initial data
DO $$
DECLARE
    i INTEGER;
    target_date DATE;
BEGIN
    FOR i IN 0..6 LOOP
        target_date := CURRENT_DATE - i;
        PERFORM public.calculate_daily_stats(target_date);
    END LOOP;
END $$;

-- Create some sample data for testing (if tables are empty)
-- Insert sample profiles if none exist
INSERT INTO public.profiles (user_id, email, display_name, role)
SELECT 
    gen_random_uuid(),
    'admin@example.com',
    'Admin User',
    'admin'
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin');

-- Insert sample AI interaction data for today if none exists
INSERT INTO public.ai_interactions (user_id, session_id, request_type, provider_name, success, response_time_ms, tokens_used)
SELECT 
    (SELECT user_id FROM public.profiles WHERE role = 'admin' LIMIT 1),
    gen_random_uuid(),
    'chat',
    'openai',
    true,
    1500,
    100
FROM generate_series(1, 5)
WHERE NOT EXISTS (SELECT 1 FROM public.ai_interactions WHERE DATE(created_at) = CURRENT_DATE);