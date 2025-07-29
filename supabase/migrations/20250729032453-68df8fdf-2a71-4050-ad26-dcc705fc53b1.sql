-- Fix the function search path security warning
CREATE OR REPLACE FUNCTION public.calculate_daily_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
      (COUNT(*) FILTER (WHERE is_bounce = true) * 100.0 / COUNT(*)) as bounce_rate
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
      (COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*)) as ai_success_rate,
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
$$;