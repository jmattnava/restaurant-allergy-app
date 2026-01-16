/*
  # Add Component Supplier Items Support

  1. New Tables
    - `component_supplier_items`
      - `id` (uuid, primary key)
      - `component_id` (uuid, foreign key to components)
      - `supplier_item_id` (uuid, foreign key to supplier_items)
      - `quantity` (text, optional quantity/measurement)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `component_supplier_items` table
    - Add policy for authenticated users to read all component supplier items
    - Add policy for authenticated users to insert component supplier items
    - Add policy for authenticated users to update component supplier items
    - Add policy for authenticated users to delete component supplier items

  3. Notes
    - This allows components to include supplier items in addition to ingredients
    - Supplier item allergens will be auto-calculated when added to components
    - Similar structure to dish_supplier_items for consistency
*/

-- Create component_supplier_items table
CREATE TABLE IF NOT EXISTS component_supplier_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id uuid REFERENCES components(id) ON DELETE CASCADE,
  supplier_item_id uuid REFERENCES supplier_items(id) ON DELETE CASCADE,
  quantity text DEFAULT ''::text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE component_supplier_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read component supplier items"
  ON component_supplier_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert component supplier items"
  ON component_supplier_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update component supplier items"
  ON component_supplier_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete component supplier items"
  ON component_supplier_items
  FOR DELETE
  TO authenticated
  USING (true);