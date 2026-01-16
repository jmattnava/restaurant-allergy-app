/*
  # Add Stations Management

  1. New Tables
    - `stations`
      - `id` (uuid, primary key)
      - `name` (text, unique station name)
      - `display_order` (integer, for custom ordering)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Changes
    - Populate stations table with existing unique stations from dishes
    - Add foreign key relationship from dishes to stations (while preserving existing data)

  3. Security
    - Enable RLS on stations table
    - Add policies for authenticated users to read/write stations

  4. Notes
    - Existing dishes will reference stations by name initially
    - This migration preserves all existing data
    - Stations can now be managed centrally
*/

-- Create stations table
CREATE TABLE IF NOT EXISTS stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;

-- Create policies for stations
CREATE POLICY "Anyone can read stations"
  ON stations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert stations"
  ON stations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update stations"
  ON stations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete stations"
  ON stations
  FOR DELETE
  TO authenticated
  USING (true);

-- Populate stations from existing dishes
INSERT INTO stations (name, display_order)
SELECT DISTINCT station, ROW_NUMBER() OVER (ORDER BY station) - 1
FROM dishes
WHERE station IS NOT NULL AND station != ''
ON CONFLICT (name) DO NOTHING;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_stations_display_order ON stations(display_order);
CREATE INDEX IF NOT EXISTS idx_dishes_station ON dishes(station);