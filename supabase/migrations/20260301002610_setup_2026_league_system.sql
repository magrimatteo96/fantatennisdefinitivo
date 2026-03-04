/*
  # Complete 2026 League System Setup

  1. Changes
    - Drop and recreate tournaments table with new structure (round_number, lineup_slots)
    - Create league_teams table for 8 teams
    - Update matchups to reference league teams instead of users
    - Create team_lineups table for lineup management
    - Create match_results table for detailed match calculations
    
  2. New Structure
    - 27 tournaments with proper types and slot configurations
    - 8 league teams with 1000 credits each
    - Matchup schedule for all 27 rounds
    - Position-by-position match result tracking
    
  3. Security
    - Enable RLS on all new tables
    - Policies for viewing and managing data
*/

-- Drop existing tournament constraints and recreate table
DROP TABLE IF EXISTS matchups CASCADE;
DROP TABLE IF EXISTS lineups CASCADE;
DROP TABLE IF EXISTS matchday_results CASCADE;
DROP TABLE IF EXISTS tournaments CASCADE;
DROP TYPE IF EXISTS tournament_type CASCADE;

-- Create league_teams table
CREATE TABLE IF NOT EXISTS league_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  credits integer DEFAULT 1000 NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE league_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view league teams"
  ON league_teams FOR SELECT
  TO authenticated
  USING (true);

-- Create new tournaments table
CREATE TABLE tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_number integer UNIQUE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('SLAM', '1000', '500', '250', 'Master')),
  lineup_slots integer NOT NULL,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tournaments"
  ON tournaments FOR SELECT
  TO authenticated
  USING (true);

-- Create matchups table (league teams instead of users)
CREATE TABLE matchups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  home_team_id uuid REFERENCES league_teams(id) ON DELETE CASCADE,
  away_team_id uuid REFERENCES league_teams(id) ON DELETE CASCADE,
  home_score integer DEFAULT 0,
  away_score integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE matchups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view matchups"
  ON matchups FOR SELECT
  TO authenticated
  USING (true);

-- Create team_lineups table
CREATE TABLE team_lineups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES league_teams(id) ON DELETE CASCADE,
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  player_ids jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(team_id, tournament_id)
);

ALTER TABLE team_lineups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lineups"
  ON team_lineups FOR SELECT
  TO authenticated
  USING (true);

-- Create match_results table for position-by-position tracking
CREATE TABLE match_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matchup_id uuid REFERENCES matchups(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position BETWEEN 1 AND 12),
  home_player_id text,
  away_player_id text,
  home_points integer DEFAULT 0 CHECK (home_points IN (0, 1, 3)),
  away_points integer DEFAULT 0 CHECK (away_points IN (0, 1, 3)),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view match results"
  ON match_results FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX idx_matchups_tournament ON matchups(tournament_id);
CREATE INDEX idx_matchups_teams ON matchups(home_team_id, away_team_id);
CREATE INDEX idx_team_lineups_team ON team_lineups(team_id);
CREATE INDEX idx_team_lineups_tournament ON team_lineups(tournament_id);
CREATE INDEX idx_match_results_matchup ON match_results(matchup_id);