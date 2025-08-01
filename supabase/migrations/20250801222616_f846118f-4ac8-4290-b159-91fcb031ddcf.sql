-- Create function to get user sessions with profile information
CREATE OR REPLACE FUNCTION public.get_user_sessions_with_profiles(
  start_date_param date DEFAULT (CURRENT_DATE - '30 days'::interval),
  end_date_param date DEFAULT CURRENT_DATE,
  limit_count integer DEFAULT 50
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  email text,
  session_start timestamp with time zone,
  session_end timestamp with time zone,
  duration_seconds integer,
  pages_visited integer,
  is_bounce boolean,
  user_agent text,
  referrer text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    us.id,
    us.user_id,
    COALESCE(p.email, 'Unknown') as email,
    us.session_start,
    us.session_end,
    us.duration_seconds,
    us.pages_visited,
    us.is_bounce,
    us.user_agent,
    us.referrer,
    us.created_at
  FROM public.user_sessions us
  LEFT JOIN public.profiles p ON us.user_id = p.user_id
  WHERE DATE(us.created_at) BETWEEN start_date_param AND end_date_param
  ORDER BY us.created_at DESC
  LIMIT limit_count;
END;
$function$;