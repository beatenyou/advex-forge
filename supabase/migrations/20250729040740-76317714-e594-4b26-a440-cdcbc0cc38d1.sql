-- Fix user_sessions table to allow null user_id for anonymous sessions
ALTER TABLE public.user_sessions ALTER COLUMN user_id DROP NOT NULL;

-- Fix the calculate_daily_stats function to handle division by zero
CREATE OR REPLACE FUNCTION public.calculate_daily_stats(target_date date DEFAULT CURRENT_DATE)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.daily_stats (
    stat_date,
    active_users,
    new_users,
    total_sessions,
    avg_session_duration,
    bounce_rate,
    total_ai_interactions,
    ai_success_rate,
    avg_response_time_ms,
    error_count
  )
  SELECT
    target_date,
    COALESCE(session_stats.active_users, 0),
    COALESCE(profile_stats.new_users, 0),
    COALESCE(session_stats.total_sessions, 0),
    COALESCE(session_stats.avg_session_duration, 0),
    COALESCE(session_stats.bounce_rate, 0),
    COALESCE(ai_stats.total_ai_interactions, 0),
    COALESCE(ai_stats.ai_success_rate, 0),
    COALESCE(ai_stats.avg_response_time_ms, 0),
    COALESCE(ai_stats.error_count, 0)
  FROM (
    SELECT
      COUNT(DISTINCT user_id) as active_users,
      COUNT(*) as total_sessions,
      AVG(duration_seconds) as avg_session_duration,
      CASE 
        WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE is_bounce = true) * 100.0 / COUNT(*))
        ELSE 0
      END as bounce_rate
    FROM public.user_sessions
    WHERE DATE(created_at) = target_date
  ) session_stats
  CROSS JOIN (
    SELECT COUNT(*) as new_users
    FROM public.profiles
    WHERE DATE(created_at) = target_date
  ) profile_stats
  CROSS JOIN (
    SELECT
      COUNT(*) as total_ai_interactions,
      CASE 
        WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*))
        ELSE 0
      END as ai_success_rate,
      AVG(response_time_ms) as avg_response_time_ms,
      COUNT(*) FILTER (WHERE success = false) as error_count
    FROM public.ai_interactions
    WHERE DATE(created_at) = target_date
  ) ai_stats
  ON CONFLICT (stat_date) DO UPDATE SET
    active_users = EXCLUDED.active_users,
    new_users = EXCLUDED.new_users,
    total_sessions = EXCLUDED.total_sessions,
    avg_session_duration = EXCLUDED.avg_session_duration,
    bounce_rate = EXCLUDED.bounce_rate,
    total_ai_interactions = EXCLUDED.total_ai_interactions,
    ai_success_rate = EXCLUDED.ai_success_rate,
    avg_response_time_ms = EXCLUDED.avg_response_time_ms,
    error_count = EXCLUDED.error_count;
END;
$function$;

-- Insert sample data for testing
INSERT INTO public.daily_stats (
  stat_date,
  active_users,
  new_users,
  total_sessions,
  avg_session_duration,
  bounce_rate,
  total_ai_interactions,
  ai_success_rate,
  avg_response_time_ms,
  error_count
) VALUES 
(CURRENT_DATE, 5, 2, 10, 300, 20.0, 15, 95.5, 1200, 1),
(CURRENT_DATE - 1, 8, 3, 15, 350, 15.0, 25, 96.0, 1100, 1),
(CURRENT_DATE - 2, 12, 1, 20, 400, 10.0, 30, 97.0, 1050, 1),
(CURRENT_DATE - 3, 15, 4, 25, 380, 12.0, 35, 94.0, 1300, 2),
(CURRENT_DATE - 4, 10, 2, 18, 420, 18.0, 28, 98.0, 980, 0),
(CURRENT_DATE - 5, 7, 1, 12, 280, 25.0, 20, 95.0, 1400, 1),
(CURRENT_DATE - 6, 9, 3, 16, 360, 20.0, 22, 96.5, 1150, 1)
ON CONFLICT (stat_date) DO NOTHING;