/*
  # Add CRUD Policies for Players

  1. Security Changes
    - Add INSERT policy for authenticated users to add players
    - Add UPDATE policy for authenticated users to modify players
    - Add DELETE policy for authenticated users to remove players
    
  2. Purpose
    - Enable full CRUD operations in the Admin panel
    - Restrict operations to authenticated users only
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can insert players" ON players;
DROP POLICY IF EXISTS "Authenticated users can update players" ON players;
DROP POLICY IF EXISTS "Authenticated users can delete players" ON players;

-- Allow authenticated users to insert players
CREATE POLICY "Authenticated users can insert players"
  ON players
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update players
CREATE POLICY "Authenticated users can update players"
  ON players
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete players
CREATE POLICY "Authenticated users can delete players"
  ON players
  FOR DELETE
  TO authenticated
  USING (true);
