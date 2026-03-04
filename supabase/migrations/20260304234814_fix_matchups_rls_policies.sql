/*
  # Fix RLS Policies for Matchups Table

  1. Changes
    - Disable RLS on matchups table for development testing
    - Allow unrestricted access to matchups data
    - Enable INSERT, SELECT, UPDATE operations without restrictions

  2. Security Notes
    - This is a temporary fix for development/testing
    - In production, you should implement proper RLS policies based on team ownership
    - Currently allowing all operations for ease of testing matchup generation

  3. Affected Operations
    - INSERT: Allow automatic matchup generation via RPC functions
    - SELECT: Allow all users to view matchups
    - UPDATE: Allow updating matchup results
*/

-- Disable RLS on matchups table for development testing
ALTER TABLE matchups DISABLE ROW LEVEL SECURITY;

-- Optional: If you want to keep RLS enabled but allow all operations, use these policies instead:
-- (Comment out the DISABLE statement above and uncomment below)

/*
-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all matchup operations" ON matchups;
DROP POLICY IF EXISTS "Enable read access for all users" ON matchups;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON matchups;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON matchups;

-- Create permissive policies
CREATE POLICY "Enable read access for all users"
  ON matchups FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON matchups FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON matchups FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
  ON matchups FOR DELETE
  USING (true);
*/
