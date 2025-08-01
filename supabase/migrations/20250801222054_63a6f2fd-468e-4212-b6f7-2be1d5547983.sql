-- Create function to get user AI usage statistics for admin dashboard
CREATE OR REPLACE FUNCTION public.get_user_ai_usage_stats(
  start_date_param DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date_param DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  display_name TEXT,
  daily_interactions INTEGER,
  total_interactions INTEGER,
  success_rate NUMERIC,
  avg_response_time NUMERIC,
  quota_used INTEGER,
  quota_limit INTEGER,
  plan_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.email,
    p.display_name,
    COALESCE(daily_stats.daily_count, 0)::INTEGER as daily_interactions,
    COALESCE(total_stats.total_count, 0)::INTEGER as total_interactions,
    COALESCE(success_stats.success_rate, 0)::NUMERIC as success_rate,
    COALESCE(avg_stats.avg_response_time, 0)::NUMERIC as avg_response_time,
    COALESCE(ub.ai_usage_current, 0)::INTEGER as quota_used,
    COALESCE(ub.ai_quota_limit, 50)::INTEGER as quota_limit,
    COALESCE(bp.name, 'Free')::TEXT as plan_name
  FROM public.profiles p
  LEFT JOIN public.user_billing ub ON p.user_id = ub.user_id
  LEFT JOIN public.billing_plans bp ON ub.plan_id = bp.id
  LEFT JOIN (
    -- Daily interactions count
    SELECT 
      ai.user_id,
      COUNT(*) as daily_count
    FROM public.ai_interactions ai
    WHERE DATE(ai.created_at) = CURRENT_DATE
    GROUP BY ai.user_id
  ) daily_stats ON p.user_id = daily_stats.user_id
  LEFT JOIN (
    -- Total interactions in date range
    SELECT 
      ai.user_id,
      COUNT(*) as total_count
    FROM public.ai_interactions ai
    WHERE DATE(ai.created_at) BETWEEN start_date_param AND end_date_param
    GROUP BY ai.user_id
  ) total_stats ON p.user_id = total_stats.user_id
  LEFT JOIN (
    -- Success rate calculation
    SELECT 
      ai.user_id,
      CASE 
        WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE ai.success = true) * 100.0 / COUNT(*))
        ELSE 0
      END as success_rate
    FROM public.ai_interactions ai
    WHERE DATE(ai.created_at) BETWEEN start_date_param AND end_date_param
    GROUP BY ai.user_id
  ) success_stats ON p.user_id = success_stats.user_id
  LEFT JOIN (
    -- Average response time
    SELECT 
      ai.user_id,
      AVG(ai.response_time_ms) as avg_response_time
    FROM public.ai_interactions ai
    WHERE DATE(ai.created_at) BETWEEN start_date_param AND end_date_param
    AND ai.response_time_ms IS NOT NULL
    GROUP BY ai.user_id
  ) avg_stats ON p.user_id = avg_stats.user_id
  WHERE p.role = 'user' -- Only include regular users, not admins
  ORDER BY total_stats.total_count DESC NULLS LAST, p.display_name;
END;
$function$