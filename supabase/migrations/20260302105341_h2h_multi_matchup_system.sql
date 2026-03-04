/*
  # H2H Multi-Matchup System Migration

  ## Overview
  Transforms the league system to support Head-to-Head fantasy tennis with multiple concurrent matchups
  per tournament where each team faces 1, 2, or 3 opponents simultaneously based on tournament type.

  ## Tournament Types and Matchup Structure
  - **SLAM**: 14 days, each team faces 3 opponents simultaneously (3 concurrent H2H matchups)
  - **MASTER 1000**: 10-12 days, each team faces 2 opponents simultaneously (2 concurrent H2H matchups)
  - **ATP 250**: 7 days, each team faces 1 opponent (1 H2H matchup)
    - Roster restriction: 4 ATP singles + 4 WTA singles + 2 doubles (instead of 5+5+2)

  ## Changes
  1. Update tournaments table with duration_days and opponents_count fields
  2. Modify matchups table to support multiple concurrent matchups per team per tournament
  3. Update championship_standings calculation to aggregate results from multiple matchups per round
  4. Create view to display active matchups by team

  ## Key Features
  - Each team's points are calculated ONCE per tournament
  - Same points are used to compete against multiple opponents
  - Each matchup generates independent W/D/L result
  - Championship standings aggregate all matchup results

  ## Security
  - All tables have RLS enabled
  - Read access for authenticated users
*/

-- Drop existing conflicting columns if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournaments' AND column_name = 'week_number'
  ) THEN
    ALTER TABLE tournaments DROP COLUMN week_number;
  END IF;
END $$;

-- Add new columns to tournaments table
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS duration_days integer DEFAULT 7;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS opponents_count integer DEFAULT 1 CHECK (opponents_count IN (1, 2, 3));

-- Update tournament types to include proper opponent counts
UPDATE tournaments SET
  opponents_count = CASE
    WHEN type = 'SLAM' THEN 3
    WHEN type = '1000' OR type = 'Master' THEN 2
    ELSE 1
  END,
  duration_days = CASE
    WHEN type = 'SLAM' THEN 14
    WHEN type = '1000' OR type = 'Master' THEN 11
    WHEN type = '500' THEN 9
    ELSE 7
  END
WHERE opponents_count IS NULL OR duration_days IS NULL;

-- Drop old matchups columns that conflict with new schema
ALTER TABLE matchups DROP COLUMN IF EXISTS atp_bonus_winner;
ALTER TABLE matchups DROP COLUMN IF EXISTS wta_bonus_winner;
ALTER TABLE matchups DROP COLUMN IF EXISTS home_atp_total;
ALTER TABLE matchups DROP COLUMN IF EXISTS away_atp_total;
ALTER TABLE matchups DROP COLUMN IF EXISTS home_wta_total;
ALTER TABLE matchups DROP COLUMN IF EXISTS away_wta_total;

-- Add championship points if they don't exist
ALTER TABLE matchups ADD COLUMN IF NOT EXISTS home_championship_points integer DEFAULT 0;
ALTER TABLE matchups ADD COLUMN IF NOT EXISTS away_championship_points integer DEFAULT 0;

-- Add detailed match statistics
ALTER TABLE matchups ADD COLUMN IF NOT EXISTS home_wins integer DEFAULT 0;
ALTER TABLE matchups ADD COLUMN IF NOT EXISTS home_draws integer DEFAULT 0;
ALTER TABLE matchups ADD COLUMN IF NOT EXISTS home_losses integer DEFAULT 0;
ALTER TABLE matchups ADD COLUMN IF NOT EXISTS away_wins integer DEFAULT 0;
ALTER TABLE matchups ADD COLUMN IF NOT EXISTS away_draws integer DEFAULT 0;
ALTER TABLE matchups ADD COLUMN IF NOT EXISTS away_losses integer DEFAULT 0;

-- Create index for efficient matchup queries
DROP INDEX IF EXISTS idx_matchups_tournament_teams;
CREATE INDEX idx_matchups_tournament_teams ON matchups(tournament_id, home_team_id, away_team_id);

-- Create view to get all active matchups for a team in current tournament
CREATE OR REPLACE VIEW team_active_matchups AS
SELECT
  m.id as matchup_id,
  m.tournament_id,
  t.name as tournament_name,
  t.type as tournament_type,
  t.opponents_count,
  m.home_team_id,
  ht.name as home_team_name,
  m.away_team_id,
  at.name as away_team_name,
  m.home_score,
  m.away_score,
  m.home_championship_points,
  m.away_championship_points,
  m.is_completed
FROM matchups m
JOIN tournaments t ON m.tournament_id = t.id
JOIN league_teams ht ON m.home_team_id = ht.id
JOIN league_teams at ON m.away_team_id = at.id
WHERE t.is_active = true;

-- Grant access to view
GRANT SELECT ON team_active_matchups TO authenticated;

-- Create function to get all opponents for a team in a tournament
CREATE OR REPLACE FUNCTION get_team_opponents_in_tournament(
  p_team_id uuid,
  p_tournament_id uuid
)
RETURNS TABLE (
  opponent_id uuid,
  opponent_name text,
  matchup_id uuid,
  is_home boolean,
  my_score integer,
  opponent_score integer,
  my_championship_points integer,
  is_completed boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN m.home_team_id = p_team_id THEN m.away_team_id
      ELSE m.home_team_id
    END as opponent_id,
    CASE
      WHEN m.home_team_id = p_team_id THEN at.name
      ELSE ht.name
    END as opponent_name,
    m.id as matchup_id,
    (m.home_team_id = p_team_id) as is_home,
    CASE
      WHEN m.home_team_id = p_team_id THEN m.home_score
      ELSE m.away_score
    END as my_score,
    CASE
      WHEN m.home_team_id = p_team_id THEN m.away_score
      ELSE m.home_score
    END as opponent_score,
    CASE
      WHEN m.home_team_id = p_team_id THEN m.home_championship_points
      ELSE m.away_championship_points
    END as my_championship_points,
    m.is_completed
  FROM matchups m
  JOIN league_teams ht ON m.home_team_id = ht.id
  JOIN league_teams at ON m.away_team_id = at.id
  WHERE
    m.tournament_id = p_tournament_id
    AND (m.home_team_id = p_team_id OR m.away_team_id = p_team_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_team_opponents_in_tournament TO authenticated;

-- Update championship_standings table if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'championship_standings' AND column_name = 'matches_won'
  ) THEN
    ALTER TABLE championship_standings ADD COLUMN matches_won integer DEFAULT 0;
    ALTER TABLE championship_standings ADD COLUMN matches_drawn integer DEFAULT 0;
    ALTER TABLE championship_standings ADD COLUMN matches_lost integer DEFAULT 0;
  END IF;
END $$;

-- Drop trigger and function CASCADE, then recreate
DROP TRIGGER IF EXISTS update_standings_on_matchup_complete ON matchups CASCADE;
DROP FUNCTION IF EXISTS update_championship_standings() CASCADE;

-- Create standalone function to calculate standings
CREATE FUNCTION calculate_championship_standings()
RETURNS void AS $$
BEGIN
  TRUNCATE TABLE championship_standings;

  INSERT INTO championship_standings (team_id, total_points, matches_won, matches_drawn, matches_lost)
  SELECT
    lt.id as team_id,
    COALESCE(SUM(
      CASE
        WHEN m.home_team_id = lt.id THEN m.home_championship_points
        WHEN m.away_team_id = lt.id THEN m.away_championship_points
        ELSE 0
      END
    ), 0) as total_points,
    COALESCE(SUM(
      CASE
        WHEN m.home_team_id = lt.id AND m.home_championship_points = 3 THEN 1
        WHEN m.away_team_id = lt.id AND m.away_championship_points = 3 THEN 1
        ELSE 0
      END
    ), 0) as matches_won,
    COALESCE(SUM(
      CASE
        WHEN m.home_team_id = lt.id AND m.home_championship_points = 1 THEN 1
        WHEN m.away_team_id = lt.id AND m.away_championship_points = 1 THEN 1
        ELSE 0
      END
    ), 0) as matches_drawn,
    COALESCE(SUM(
      CASE
        WHEN m.home_team_id = lt.id AND m.home_championship_points = 0 THEN 1
        WHEN m.away_team_id = lt.id AND m.away_championship_points = 0 THEN 1
        ELSE 0
      END
    ), 0) as matches_lost
  FROM league_teams lt
  LEFT JOIN matchups m ON (m.home_team_id = lt.id OR m.away_team_id = lt.id) AND m.is_completed = true
  GROUP BY lt.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION calculate_championship_standings TO authenticated;

-- Create trigger function
CREATE FUNCTION update_championship_standings_trigger()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM calculate_championship_standings();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER update_standings_on_matchup_complete
  AFTER INSERT OR UPDATE ON matchups
  FOR EACH ROW
  WHEN (NEW.is_completed = true)
  EXECUTE FUNCTION update_championship_standings_trigger();