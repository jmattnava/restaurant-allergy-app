/*
  # Add Allergy Matrices Support

  1. New Tables
    - `allergy_matrices`
      - `id` (uuid, primary key)
      - `name` (text, the name of the matrix)
      - `type` (text, either 'station' or 'custom')
      - `station` (text, optional, for station-based matrices)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `matrix_dishes`
      - `id` (uuid, primary key)
      - `matrix_id` (uuid, foreign key to allergy_matrices)
      - `dish_id` (uuid, foreign key to dishes)
      - `order_index` (integer, for maintaining dish order)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read/write matrices
    - Add policies for authenticated users to read/write matrix dishes

  3. Notes
    - Matrices can be saved and reused
    - Station matrices are auto-generated but can be saved
    - Custom matrices allow manual dish selection
    - Dishes maintain their order in the matrix for printing
*/

-- Create allergy_matrices table
CREATE TABLE IF NOT EXISTS allergy_matrices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'custom',
  station text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create matrix_dishes junction table
CREATE TABLE IF NOT EXISTS matrix_dishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_id uuid REFERENCES allergy_matrices(id) ON DELETE CASCADE,
  dish_id uuid REFERENCES dishes(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(matrix_id, dish_id)
);

-- Enable RLS
ALTER TABLE allergy_matrices ENABLE ROW LEVEL SECURITY;
ALTER TABLE matrix_dishes ENABLE ROW LEVEL SECURITY;

-- Create policies for allergy_matrices
CREATE POLICY "Anyone can read allergy matrices"
  ON allergy_matrices
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert allergy matrices"
  ON allergy_matrices
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update allergy matrices"
  ON allergy_matrices
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete allergy matrices"
  ON allergy_matrices
  FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for matrix_dishes
CREATE POLICY "Anyone can read matrix dishes"
  ON matrix_dishes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert matrix dishes"
  ON matrix_dishes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update matrix dishes"
  ON matrix_dishes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete matrix dishes"
  ON matrix_dishes
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_matrix_dishes_matrix_id ON matrix_dishes(matrix_id);
CREATE INDEX IF NOT EXISTS idx_matrix_dishes_order ON matrix_dishes(matrix_id, order_index);