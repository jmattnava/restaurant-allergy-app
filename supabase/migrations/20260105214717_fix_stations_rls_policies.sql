/*
  # Fix Stations RLS Policies

  1. Changes
    - Drop existing authenticated-only policies
    - Create new anon-accessible policies for stations table
    - Allow anonymous users full CRUD access to stations

  2. Security
    - Policies updated to allow anon access since this app has no auth
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read stations" ON stations;
DROP POLICY IF EXISTS "Anyone can insert stations" ON stations;
DROP POLICY IF EXISTS "Anyone can update stations" ON stations;
DROP POLICY IF EXISTS "Anyone can delete stations" ON stations;

-- Create new policies for anon access
CREATE POLICY "Enable read access for all users"
  ON stations FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Enable insert access for all users"
  ON stations FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Enable update access for all users"
  ON stations FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete access for all users"
  ON stations FOR DELETE
  TO anon
  USING (true);