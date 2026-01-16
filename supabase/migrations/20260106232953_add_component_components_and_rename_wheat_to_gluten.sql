/*
  # Add Component-to-Component Support and Rename Wheat to Gluten

  1. New Tables
    - `component_components`
      - `id` (uuid, primary key)
      - `parent_component_id` (uuid, foreign key to components)
      - `child_component_id` (uuid, foreign key to components)
      - `quantity` (text, optional quantity/measurement)
      - `created_at` (timestamp)

  2. Data Migration
    - Update all 'wheat' allergen references to 'gluten' in:
      - ingredients table
      - supplier_items table
      - components table
      - dishes table

  3. Security
    - Enable RLS on `component_components` table
    - Add policies for public access to match other component relation tables

  4. Notes
    - This allows components to contain other components for complex recipes
    - Components can now be nested (e.g., "House Dressing" component can contain "Herb Mix" component)
    - Allergens will be auto-calculated from nested components
*/

-- Create component_components table
CREATE TABLE IF NOT EXISTS component_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_component_id uuid REFERENCES components(id) ON DELETE CASCADE,
  child_component_id uuid REFERENCES components(id) ON DELETE CASCADE,
  quantity text DEFAULT ''::text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_reference CHECK (parent_component_id != child_component_id)
);

-- Enable RLS
ALTER TABLE component_components ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access to component_components"
  ON component_components
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to component_components"
  ON component_components
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to component_components"
  ON component_components
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to component_components"
  ON component_components
  FOR DELETE
  TO public
  USING (true);

-- Update allergen references from 'wheat' to 'gluten'
UPDATE ingredients
SET allergens = array_replace(allergens, 'wheat', 'gluten')
WHERE 'wheat' = ANY(allergens);

UPDATE supplier_items
SET allergens = array_replace(allergens, 'wheat', 'gluten')
WHERE 'wheat' = ANY(allergens);

UPDATE components
SET allergens = array_replace(allergens, 'wheat', 'gluten')
WHERE 'wheat' = ANY(allergens);

UPDATE dishes
SET allergens = array_replace(allergens, 'wheat', 'gluten')
WHERE 'wheat' = ANY(allergens);
