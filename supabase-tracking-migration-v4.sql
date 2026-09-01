-- ==========================================
-- Supabase Migration V4: Driver Live Tracking
-- Description: Adds a table for live driver GPS tracking and enables Realtime
-- ==========================================

-- 1. Create the Driver Locations table
CREATE TABLE IF NOT EXISTS public.driver_locations (
  driver_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Drivers can insert/update their own location" ON public.driver_locations;
DROP POLICY IF EXISTS "Admins can view all locations" ON public.driver_locations;
DROP POLICY IF EXISTS "Anyone can view locations" ON public.driver_locations;

-- Allow drivers to update their own row
CREATE POLICY "Drivers can insert/update their own location" 
  ON public.driver_locations
  FOR ALL
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

-- Allow Admins to read all rows
-- We can also just allow authenticated read since only drivers and admins exist.
CREATE POLICY "Anyone can view locations"
  ON public.driver_locations
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. Enable Supabase Realtime for this table
-- This is necessary to stream location updates to the Admin's Leaflet map
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
