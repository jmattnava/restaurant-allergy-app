/*
  # Add May Contain and Cross-Contact Fields

  1. Changes
    - Add `may_contain` array column to `ingredients` table for trace allergen warnings
    - Add `may_contain` array column to `supplier_items` table for trace allergen warnings
    - Add `cross_contact` boolean column to `ingredients` table for shared equipment concerns
    - Add `cross_contact` boolean column to `components` table for shared equipment concerns
    - All fields default to empty/false for existing records
    
  2. Purpose
    - Track potential allergen contamination from shared equipment or facilities
    - Distinguish between definitive allergens and "may contain" warnings
    - Enable better allergen risk assessment for sensitive guests
*/

-- Add may_contain field to ingredients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ingredients' AND column_name = 'may_contain'
  ) THEN
    ALTER TABLE ingredients ADD COLUMN may_contain text[] DEFAULT '{}';
  END IF;
END $$;

-- Add cross_contact field to ingredients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ingredients' AND column_name = 'cross_contact'
  ) THEN
    ALTER TABLE ingredients ADD COLUMN cross_contact boolean DEFAULT false;
  END IF;
END $$;

-- Add may_contain field to supplier_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'supplier_items' AND column_name = 'may_contain'
  ) THEN
    ALTER TABLE supplier_items ADD COLUMN may_contain text[] DEFAULT '{}';
  END IF;
END $$;

-- Add cross_contact field to components
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'components' AND column_name = 'cross_contact'
  ) THEN
    ALTER TABLE components ADD COLUMN cross_contact boolean DEFAULT false;
  END IF;
END $$;