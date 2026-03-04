/*
  # Disable RLS for League Operations

  1. Changes
    - Disable Row Level Security on league_teams table
    - Disable Row Level Security on team_players table
    - Keep players RLS but add public read policy
  
  2. Security
    - Allow public read access to league data
    - This is necessary for the frontend to display all teams
*/

-- Disable RLS on league_teams (allow full public access)
ALTER TABLE league_teams DISABLE ROW LEVEL SECURITY;

-- Disable RLS on team_players (allow full public access)
ALTER TABLE team_players DISABLE ROW LEVEL SECURITY;

-- Keep RLS on players but ensure public can read
DROP POLICY IF EXISTS "Public can view all players" ON players;
CREATE POLICY "Public can view all players"
  ON players
  FOR SELECT
  TO anon, authenticated
  USING (true);
