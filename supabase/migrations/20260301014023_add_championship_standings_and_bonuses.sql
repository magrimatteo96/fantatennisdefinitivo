/*
  # Championship Standings and Bonus System

  1. New Tables
    - `championship_standings` - Tracks team standings across the season
      - `team_id` (uuid, FK to league_teams)
      - `points` (integer) - Championship points (3 for win, 1 for draw)
      - `wins` (integer)
      - `draws` (integer)
      - `losses` (integer)
      - `total_fanta_points` (integer) - Sum of all matchup points (tiebreaker)
      - `updated_at` (timestamptz)
    
    - `player_tournament_points` - Real points per player per tournament
      - `player_id` (uuid, FK to players)
      - `tournament_id` (uuid, FK to tournaments)
      - `points` (integer) - Real tennis points earned
      - `updated_at` (timestamptz)
  
  2. Schema Changes
    - Add `championship_points` to matchups (home/away)
    - Add `atp_bonus_winner` and `wta_bonus_winner` to matchups
  
  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated read access

  ## Important Notes
  - Championship points: 3 for win, 1 for draw, 0 for loss
  - ATP/WTA bonuses: +3 points to team with highest sum in category
  - Auto-substitution: Replace 0-point starters with non-zero reserves
*/

-- Add bonus tracking columns to matchups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matchups' AND column_name = 'home_championship_points'
  ) THEN
    ALTER TABLE matchups ADD COLUMN home_championship_points integer DEFAULT 0;
    ALTER TABLE matchups ADD COLUMN away_championship_points integer DEFAULT 0;
    ALTER TABLE matchups ADD COLUMN atp_bonus_winner text CHECK (atp_bonus_winner IN ('home', 'away', 'none'));
    ALTER TABLE matchups ADD COLUMN wta_bonus_winner text CHECK (wta_bonus_winner IN ('home', 'away', 'none'));
    ALTER TABLE matchups ADD COLUMN home_atp_total integer DEFAULT 0;
    ALTER TABLE matchups ADD COLUMN away_atp_total integer DEFAULT 0;
    ALTER TABLE matchups ADD COLUMN home_wta_total integer DEFAULT 0;
    ALTER TABLE matchups ADD COLUMN away_wta_total integer DEFAULT 0;
  END IF;
END $$;

-- Create player_tournament_points table if not exists
CREATE TABLE IF NOT EXISTS player_tournament_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  points integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(player_id, tournament_id)
);

ALTER TABLE player_tournament_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view player points"
  ON player_tournament_points FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage player points"
  ON player_tournament_points FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create championship standings table
CREATE TABLE IF NOT EXISTS championship_standings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES league_teams(id) ON DELETE CASCADE NOT NULL,
  points integer DEFAULT 0,
  wins integer DEFAULT 0,
  draws integer DEFAULT 0,
  losses integer DEFAULT 0,
  total_fanta_points integer DEFAULT 0,
  matches_played integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(team_id)
);

ALTER TABLE championship_standings ENABLE ROW LEVEL SECURITY;

-- Initialize standings for all teams
INSERT INTO championship_standings (team_id, points, wins, draws, losses, total_fanta_points, matches_played)
SELECT id, 0, 0, 0, 0, 0, 0
FROM league_teams
ON CONFLICT (team_id) DO NOTHING;

-- Policies for championship_standings
CREATE POLICY "Anyone can view standings"
  ON championship_standings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update standings"
  ON championship_standings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to update standings after matchup completion
CREATE OR REPLACE FUNCTION update_championship_standings()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_completed = true AND (OLD.is_completed = false OR OLD.is_completed IS NULL) THEN
    -- Update home team
    UPDATE championship_standings
    SET 
      points = points + NEW.home_championship_points,
      wins = wins + CASE WHEN NEW.home_championship_points = 3 THEN 1 ELSE 0 END,
      draws = draws + CASE WHEN NEW.home_championship_points = 1 THEN 1 ELSE 0 END,
      losses = losses + CASE WHEN NEW.home_championship_points = 0 THEN 1 ELSE 0 END,
      total_fanta_points = total_fanta_points + NEW.home_score,
      matches_played = matches_played + 1,
      updated_at = now()
    WHERE team_id = NEW.home_team_id;
    
    -- Update away team
    UPDATE championship_standings
    SET 
      points = points + NEW.away_championship_points,
      wins = wins + CASE WHEN NEW.away_championship_points = 3 THEN 1 ELSE 0 END,
      draws = draws + CASE WHEN NEW.away_championship_points = 1 THEN 1 ELSE 0 END,
      losses = losses + CASE WHEN NEW.away_championship_points = 0 THEN 1 ELSE 0 END,
      total_fanta_points = total_fanta_points + NEW.away_score,
      matches_played = matches_played + 1,
      updated_at = now()
    WHERE team_id = NEW.away_team_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic standings update
DROP TRIGGER IF EXISTS update_standings_on_matchup_complete ON matchups;
CREATE TRIGGER update_standings_on_matchup_complete
  AFTER UPDATE ON matchups
  FOR EACH ROW
  EXECUTE FUNCTION update_championship_standings();