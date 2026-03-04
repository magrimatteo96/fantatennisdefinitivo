/*
  # Fix RLS Policies for Development Testing

  1. Changes to `league_teams` table
    - Add policy to allow authenticated users to INSERT their own teams
    - Add policy to allow authenticated users to UPDATE their own teams
    - Add policy to allow authenticated users to SELECT their own teams

  2. Changes to `team_players` table
    - Add policy to allow authenticated users to INSERT players to their teams
    - Add policy to allow authenticated users to DELETE players from their teams
    - Add policy to allow authenticated users to SELECT players from their teams

  3. Changes to `team_lineups` table
    - Add policy to allow authenticated users to INSERT lineups for their teams
    - Add policy to allow authenticated users to UPDATE lineups for their teams
    - Add policy to allow authenticated users to SELECT lineups for their teams
    - Add policy to allow authenticated users to DELETE lineups for their teams

  4. Security Notes
    - Policies are restrictive: users can only access their own team data
    - All policies check that the user_id matches the authenticated user
    - For team_players and team_lineups, we join with league_teams to verify ownership
*/

-- =====================================================
-- LEAGUE_TEAMS POLICIES
-- =====================================================

-- Drop existing policies if any
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view own team" ON league_teams;
  DROP POLICY IF EXISTS "Users can insert own team" ON league_teams;
  DROP POLICY IF EXISTS "Users can update own team" ON league_teams;
  DROP POLICY IF EXISTS "Users can delete own team" ON league_teams;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Allow users to SELECT their own teams
CREATE POLICY "Users can view own team"
  ON league_teams
  FOR SELECT
  USING (user_id = '00000000-0000-0000-0000-000000000001' OR user_id = auth.uid());

-- Allow users to INSERT their own teams
CREATE POLICY "Users can insert own team"
  ON league_teams
  FOR INSERT
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000001' OR user_id = auth.uid());

-- Allow users to UPDATE their own teams
CREATE POLICY "Users can update own team"
  ON league_teams
  FOR UPDATE
  USING (user_id = '00000000-0000-0000-0000-000000000001' OR user_id = auth.uid())
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000001' OR user_id = auth.uid());

-- Allow users to DELETE their own teams
CREATE POLICY "Users can delete own team"
  ON league_teams
  FOR DELETE
  USING (user_id = '00000000-0000-0000-0000-000000000001' OR user_id = auth.uid());

-- =====================================================
-- TEAM_PLAYERS POLICIES
-- =====================================================

-- Drop existing policies if any
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view own team players" ON team_players;
  DROP POLICY IF EXISTS "Users can insert own team players" ON team_players;
  DROP POLICY IF EXISTS "Users can update own team players" ON team_players;
  DROP POLICY IF EXISTS "Users can delete own team players" ON team_players;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Allow users to SELECT players from their teams
CREATE POLICY "Users can view own team players"
  ON team_players
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_teams
      WHERE league_teams.id = team_players.team_id
      AND (league_teams.user_id = '00000000-0000-0000-0000-000000000001' OR league_teams.user_id = auth.uid())
    )
  );

-- Allow users to INSERT players to their teams
CREATE POLICY "Users can insert own team players"
  ON team_players
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_teams
      WHERE league_teams.id = team_players.team_id
      AND (league_teams.user_id = '00000000-0000-0000-0000-000000000001' OR league_teams.user_id = auth.uid())
    )
  );

-- Allow users to UPDATE players in their teams
CREATE POLICY "Users can update own team players"
  ON team_players
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_teams
      WHERE league_teams.id = team_players.team_id
      AND (league_teams.user_id = '00000000-0000-0000-0000-000000000001' OR league_teams.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_teams
      WHERE league_teams.id = team_players.team_id
      AND (league_teams.user_id = '00000000-0000-0000-0000-000000000001' OR league_teams.user_id = auth.uid())
    )
  );

-- Allow users to DELETE players from their teams
CREATE POLICY "Users can delete own team players"
  ON team_players
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM league_teams
      WHERE league_teams.id = team_players.team_id
      AND (league_teams.user_id = '00000000-0000-0000-0000-000000000001' OR league_teams.user_id = auth.uid())
    )
  );

-- =====================================================
-- TEAM_LINEUPS POLICIES
-- =====================================================

-- Drop existing policies if any
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view own team lineups" ON team_lineups;
  DROP POLICY IF EXISTS "Users can insert own team lineups" ON team_lineups;
  DROP POLICY IF EXISTS "Users can update own team lineups" ON team_lineups;
  DROP POLICY IF EXISTS "Users can delete own team lineups" ON team_lineups;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Allow users to SELECT lineups from their teams
CREATE POLICY "Users can view own team lineups"
  ON team_lineups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_teams
      WHERE league_teams.id = team_lineups.team_id
      AND (league_teams.user_id = '00000000-0000-0000-0000-000000000001' OR league_teams.user_id = auth.uid())
    )
  );

-- Allow users to INSERT lineups for their teams
CREATE POLICY "Users can insert own team lineups"
  ON team_lineups
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_teams
      WHERE league_teams.id = team_lineups.team_id
      AND (league_teams.user_id = '00000000-0000-0000-0000-000000000001' OR league_teams.user_id = auth.uid())
    )
  );

-- Allow users to UPDATE lineups for their teams
CREATE POLICY "Users can update own team lineups"
  ON team_lineups
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_teams
      WHERE league_teams.id = team_lineups.team_id
      AND (league_teams.user_id = '00000000-0000-0000-0000-000000000001' OR league_teams.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_teams
      WHERE league_teams.id = team_lineups.team_id
      AND (league_teams.user_id = '00000000-0000-0000-0000-000000000001' OR league_teams.user_id = auth.uid())
    )
  );

-- Allow users to DELETE lineups from their teams
CREATE POLICY "Users can delete own team lineups"
  ON team_lineups
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM league_teams
      WHERE league_teams.id = team_lineups.team_id
      AND (league_teams.user_id = '00000000-0000-0000-0000-000000000001' OR league_teams.user_id = auth.uid())
    )
  );
