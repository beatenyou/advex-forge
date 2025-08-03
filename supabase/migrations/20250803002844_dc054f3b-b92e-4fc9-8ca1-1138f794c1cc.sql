-- Enable real-time for cheat_sheets table
ALTER TABLE public.cheat_sheets REPLICA IDENTITY FULL;

-- Add the cheat_sheets table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.cheat_sheets;