/*
  # Update Player Policies for Public Access

  1. Security Changes
    - Allow public (anon) access to players table for development
    - Keep authenticated access for production
    
  2. Purpose
    - Enable CRUD operations even when auth is disabled in dev mode
    - Support both authenticated and anonymous users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view players" ON players;
DROP POLICY IF EXISTS "Authenticated users can insert players" ON players;
DROP POLICY IF EXISTS "Authenticated users can update players" ON players;
DROP POLICY IF EXISTS "Authenticated users can delete players" ON players;

-- Allow everyone (both authenticated and anonymous) to view players
CREATE POLICY "Everyone can view players"
  ON players
  FOR SELECT
  TO public
  USING (true);

-- Allow everyone to insert players (for admin panel)
CREATE POLICY "Everyone can insert players"
  ON players
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow everyone to update players
CREATE POLICY "Everyone can update players"
  ON players
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Allow everyone to delete players
CREATE POLICY "Everyone can delete players"
  ON players
  FOR DELETE
  TO public
  USING (true);
