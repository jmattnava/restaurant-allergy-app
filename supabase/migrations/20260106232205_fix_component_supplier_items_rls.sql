/*
  # Fix Component Supplier Items RLS Policies

  1. Changes
    - Drop existing policies on `component_supplier_items` that restrict to authenticated users
    - Add new policies that allow public access to match `component_ingredients` table
    - This ensures consistent access patterns across both relation tables

  2. Security
    - Policies updated to use `public` role instead of `authenticated`
    - Maintains same level of access control as component_ingredients table
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read component supplier items" ON component_supplier_items;
DROP POLICY IF EXISTS "Anyone can insert component supplier items" ON component_supplier_items;
DROP POLICY IF EXISTS "Anyone can update component supplier items" ON component_supplier_items;
DROP POLICY IF EXISTS "Anyone can delete component supplier items" ON component_supplier_items;

-- Create new policies for public access
CREATE POLICY "Allow public read access to component_supplier_items"
  ON component_supplier_items
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to component_supplier_items"
  ON component_supplier_items
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to component_supplier_items"
  ON component_supplier_items
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to component_supplier_items"
  ON component_supplier_items
  FOR DELETE
  TO public
  USING (true);
