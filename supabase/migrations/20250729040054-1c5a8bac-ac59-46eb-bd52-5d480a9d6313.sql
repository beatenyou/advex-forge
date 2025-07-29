-- Enable the pg_cron extension for scheduled tasks (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily stats calculation to run every day at 1 AM UTC
-- First, remove existing job if it exists
SELECT cron.unschedule('calculate-daily-stats');

-- Then create the new scheduled job
SELECT cron.schedule(
  'calculate-daily-stats',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://csknxtzjfdqoaoforrfm.supabase.co/functions/v1/calculate-daily-stats',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNza254dHpqZmRxb2FvZm9ycmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MTczMTgsImV4cCI6MjA2OTI5MzMxOH0.MNglSbyBWQw2BcxTzC0stq13FNyi9Hxsv3sSGYP_G1M"}'::jsonb,
    body := concat('{"date": "', CURRENT_DATE, '"}')::jsonb
  );
  $$
);