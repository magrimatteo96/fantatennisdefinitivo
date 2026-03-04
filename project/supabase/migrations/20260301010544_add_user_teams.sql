/*
  # Add User Team Management

  1. Changes
    - Add user_id column to league_teams table
    - Allow users to own their team
    - Create a team for the logged in user

  2. Security
    - Users can view all teams
    - Users can only update their own team
*/

-- Add user_id column to league_teams
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'league_teams' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE league_teams ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for user_id
CREATE INDEX IF NOT EXISTS idx_league_teams_user ON league_teams(user_id);

-- Update RLS policies
DROP POLICY IF EXISTS "Anyone can view league teams" ON league_teams;

CREATE POLICY "Anyone can view league teams"
  ON league_teams FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their own team"
  ON league_teams FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own team"
  ON league_teams FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);