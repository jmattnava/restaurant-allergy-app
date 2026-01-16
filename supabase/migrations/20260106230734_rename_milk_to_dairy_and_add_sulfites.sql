/*
  # Rename Milk allergen to Dairy

  1. Changes
    - Updates all allergen references from 'milk' to 'dairy' in:
      - ingredients table (allergens and may_contain columns)
      - supplier_items table (allergens and may_contain columns)
      - components table (allergens column)
      - dishes table (allergens column)
    - This migration adds support for the new 'sulfites' allergen (no data updates needed)
    
  2. Notes
    - Uses array_replace to safely replace 'milk' with 'dairy' in all allergen arrays
    - Preserves all other allergen data
    - The 'sulfites' allergen will be available for selection in the UI
*/

-- Update ingredients table
UPDATE ingredients
SET allergens = array_replace(allergens, 'milk', 'dairy')
WHERE 'milk' = ANY(allergens);

UPDATE ingredients
SET may_contain = array_replace(may_contain, 'milk', 'dairy')
WHERE 'milk' = ANY(may_contain);

-- Update supplier_items table
UPDATE supplier_items
SET allergens = array_replace(allergens, 'milk', 'dairy')
WHERE 'milk' = ANY(allergens);

UPDATE supplier_items
SET may_contain = array_replace(may_contain, 'milk', 'dairy')
WHERE 'milk' = ANY(may_contain);

-- Update components table
UPDATE components
SET allergens = array_replace(allergens, 'milk', 'dairy')
WHERE 'milk' = ANY(allergens);

-- Update dishes table
UPDATE dishes
SET allergens = array_replace(allergens, 'milk', 'dairy')
WHERE 'milk' = ANY(allergens);
