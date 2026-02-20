-- Create the records table
CREATE TABLE IF NOT EXISTS public.records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date text NOT NULL,
  day_name text NOT NULL,
  inspector text NOT NULL,
  building_id text NOT NULL,
  building_name text NOT NULL,
  room_id text NOT NULL,
  room_name text NOT NULL,
  lights boolean DEFAULT false,
  computer boolean DEFAULT false,
  aircon boolean DEFAULT false,
  fan boolean DEFAULT false,
  score integer DEFAULT 0,
  status text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Prevent duplicate entries for the same room on the same date
  UNIQUE(date, building_id, room_id)
);

-- Enable Row Level Security
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anonymous/public inserts (since we don't have user auth login)
CREATE POLICY "Allow anonymous inserts" ON public.records
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create policy to allow anonymous/public reads
CREATE POLICY "Allow public reads" ON public.records
  FOR SELECT
  TO public, anon
  USING (true);

-- Create policy to allow anonymous/public updates (for re-submitting an existing room's check)
CREATE POLICY "Allow anonymous updates" ON public.records
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
