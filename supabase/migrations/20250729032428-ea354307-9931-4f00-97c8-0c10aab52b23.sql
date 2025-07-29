-- Create tables for tracking user statistics and analytics

-- User engagement metrics
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_end TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  pages_visited INTEGER DEFAULT 1,
  is_bounce BOOLEAN DEFAULT false,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI interaction metrics
CREATE TABLE public.ai_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id UUID,
  provider_name TEXT,
  request_type TEXT, -- 'chat', 'command_generation', etc.
  request_size INTEGER, -- characters or tokens
  response_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_type TEXT,
  user_satisfaction INTEGER CHECK (user_satisfaction >= 1 AND user_satisfaction <= 5),
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- System performance metrics
CREATE TABLE public.performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL, -- 'response_time', 'error_rate', 'throughput', 'uptime'
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT NOT NULL, -- 'ms', 'percent', 'requests_per_minute', 'seconds'
  service_name TEXT, -- 'web_app', 'ai_service', 'database'
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Traffic analytics
CREATE TABLE public.traffic_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID,
  page_path TEXT NOT NULL,
  referrer_source TEXT, -- 'direct', 'google', 'social', etc.
  country_code TEXT,
  city TEXT,
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  browser TEXT,
  operating_system TEXT,
  visit_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Daily aggregated statistics for efficient querying
CREATE TABLE public.daily_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stat_date DATE NOT NULL,
  active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  avg_session_duration NUMERIC DEFAULT 0,
  bounce_rate NUMERIC DEFAULT 0,
  total_ai_interactions INTEGER DEFAULT 0,
  ai_success_rate NUMERIC DEFAULT 0,
  avg_response_time_ms NUMERIC DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(stat_date)
);

-- Enable Row Level Security
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins can view analytics data
CREATE POLICY "Admins can view user sessions" 
ON public.user_sessions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
));

CREATE POLICY "Admins can view AI interactions" 
ON public.ai_interactions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
));

CREATE POLICY "Admins can view performance metrics" 
ON public.performance_metrics 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
));

CREATE POLICY "Admins can view traffic analytics" 
ON public.traffic_analytics 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
));

CREATE POLICY "Admins can view daily stats" 
ON public.daily_stats 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
));

-- Policies for inserting data (system can insert)
CREATE POLICY "System can insert user sessions" 
ON public.user_sessions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can insert AI interactions" 
ON public.ai_interactions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can insert performance metrics" 
ON public.performance_metrics 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can insert traffic analytics" 
ON public.traffic_analytics 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can insert daily stats" 
ON public.daily_stats 
FOR INSERT 
WITH CHECK (true);

-- Allow system to update sessions and daily stats
CREATE POLICY "System can update user sessions" 
ON public.user_sessions 
FOR UPDATE 
USING (true);

CREATE POLICY "System can update daily stats" 
ON public.daily_stats 
FOR UPDATE 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_created_at ON public.user_sessions(created_at);
CREATE INDEX idx_ai_interactions_user_id ON public.ai_interactions(user_id);
CREATE INDEX idx_ai_interactions_created_at ON public.ai_interactions(created_at);
CREATE INDEX idx_performance_metrics_type_recorded ON public.performance_metrics(metric_type, recorded_at);
CREATE INDEX idx_traffic_analytics_timestamp ON public.traffic_analytics(visit_timestamp);
CREATE INDEX idx_daily_stats_date ON public.daily_stats(stat_date);

-- Function to calculate daily statistics
CREATE OR REPLACE FUNCTION public.calculate_daily_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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