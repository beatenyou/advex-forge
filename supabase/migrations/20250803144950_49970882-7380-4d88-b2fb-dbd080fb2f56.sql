-- Clean up any orphaned auth sessions to help with the user's login issues
SELECT force_clean_user_auth('29c32282-cfff-46d7-9a95-53314d335175');

-- Clean up any stale browser sessions that might be causing issues
UPDATE user_sessions 
SET session_end = NOW(), 
    duration_seconds = EXTRACT(EPOCH FROM (NOW() - session_start))::INTEGER
WHERE user_id = '29c32282-cfff-46d7-9a95-53314d335175' 
AND session_end IS NULL;