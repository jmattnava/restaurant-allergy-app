/*
  # Add Removable Flags to Dish Relations

  1. Changes
    - Add `removable` boolean column to `dish_ingredients` table
    - Add `removable` boolean column to `dish_supplier_items` table
    - Add `removable` boolean column to `dish_components` table
    - All default to `false` for existing records
    
  2. Purpose
    - Track which items in a dish can be removed for allergy accommodations
    - Enables better service assistance for guests with dietary restrictions
*/

-- Add removable flag to dish_ingredients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dish_ingredients' AND column_name = 'removable'
  ) THEN
    ALTER TABLE dish_ingredients ADD COLUMN removable boolean DEFAULT false;
  END IF;
END $$;

-- Add removable flag to dish_supplier_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dish_supplier_items' AND column_name = 'removable'
  ) THEN
    ALTER TABLE dish_supplier_items ADD COLUMN removable boolean DEFAULT false;
  END IF;
END $$;

-- Add removable flag to dish_components
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dish_components' AND column_name = 'removable'
  ) THEN
    ALTER TABLE dish_components ADD COLUMN removable boolean DEFAULT false;
  END IF;
END $$;