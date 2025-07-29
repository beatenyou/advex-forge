-- Insert a sample announcement to demonstrate the system
INSERT INTO public.announcements (
  title,
  message,
  type,
  is_active,
  target_audience,
  priority,
  start_date,
  end_date
) VALUES (
  'Welcome to the Enhanced RedTeam Platform!',
  'We''ve added new features including AI-powered chat assistance, saved prompts with quick access using "/", and comprehensive support tickets. Explore the new functionality and reach out if you need help!',
  'info',
  true,
  'all',
  2,
  now(),
  now() + interval '30 days'
);