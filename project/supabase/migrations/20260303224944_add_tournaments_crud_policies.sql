/*
  # Add Full CRUD Policies for Tournaments Table

  1. Purpose
    - Allows authenticated users to INSERT, UPDATE, and DELETE tournaments
    - Tournaments table is admin-controlled, so policies are permissive
    - This fixes "new row violates row-level security policy" error

  2. Policies Added
    - INSERT: Authenticated users can insert tournaments
    - UPDATE: Authenticated users can update tournaments
    - DELETE: Authenticated users can delete tournaments
    - SELECT: Already exists (anyone can view)

  3. Security Notes
    - In production, these could be restricted to admin users only
    - For now, all authenticated users have full access to manage tournaments
*/

-- Drop existing policies if any (except SELECT which already exists)
DROP POLICY IF EXISTS "Authenticated users can insert tournaments" ON tournaments;
DROP POLICY IF EXISTS "Authenticated users can update tournaments" ON tournaments;
DROP POLICY IF EXISTS "Authenticated users can delete tournaments" ON tournaments;

-- Policy for INSERT
CREATE POLICY "Authenticated users can insert tournaments"
  ON tournaments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy for UPDATE
CREATE POLICY "Authenticated users can update tournaments"
  ON tournaments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy for DELETE
CREATE POLICY "Authenticated users can delete tournaments"
  ON tournaments
  FOR DELETE
  TO authenticated
  USING (true);

-- Verify policies are active
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'tournaments';
  
  RAISE NOTICE '✅ Total RLS policies on tournaments table: %', policy_count;
  
  IF policy_count < 4 THEN
    RAISE WARNING 'Expected at least 4 policies (SELECT, INSERT, UPDATE, DELETE), found %', policy_count;
  END IF;
END $$;