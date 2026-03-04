-- DISABLE RLS ON ALL CRITICAL TABLES
-- Run this script in Supabase SQL Editor to bypass RLS during development

ALTER TABLE tournaments DISABLE ROW LEVEL SECURITY;
ALTER TABLE league_teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_lineups DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_matchups DISABLE ROW LEVEL SECURITY;
ALTER TABLE player_match_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE championship_bonuses DISABLE ROW LEVEL SECURITY;
ALTER TABLE global_matchdays DISABLE ROW LEVEL SECURITY;

-- Grant all permissions to anon users (development only)
GRANT ALL ON tournaments TO anon;
GRANT ALL ON league_teams TO anon;
GRANT ALL ON players TO anon;
GRANT ALL ON team_players TO anon;
GRANT ALL ON team_lineups TO anon;
GRANT ALL ON team_matchups TO anon;
GRANT ALL ON player_match_results TO anon;
GRANT ALL ON championship_bonuses TO anon;
GRANT ALL ON global_matchdays TO anon;

-- Verify
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'tournaments', 'league_teams', 'players', 'team_players',
    'team_lineups', 'team_matchups', 'player_match_results',
    'championship_bonuses', 'global_matchdays'
  )
ORDER BY tablename;
