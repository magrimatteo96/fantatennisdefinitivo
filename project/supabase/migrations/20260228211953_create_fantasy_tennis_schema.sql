/*
  # Fantasy Tennis Database Schema

  1. New Tables
    - `players`
      - `id` (uuid, primary key)
      - `name` (text) - Player full name
      - `tour` (text) - 'ATP' or 'WTA'
      - `ranking` (integer) - Current ranking
      - `price` (integer) - Player cost in credits
      - `total_points` (integer) - Season fantasy points
      - `image_url` (text) - Player image URL (optional)
      - `created_at` (timestamptz)
    
    - `user_squads`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - References auth.users
      - `player_id` (uuid) - References players
      - `acquired_at` (timestamptz)
      - Constraint: Each user can have max 20 players (10 ATP, 10 WTA)
    
    - `tournaments`
      - `id` (uuid, primary key)
      - `name` (text) - Tournament name
      - `type` (text) - 'SLAM', 'MASTER1000', 'ATP250'
      - `week_number` (integer) - Week of the season
      - `start_date` (date)
      - `is_active` (boolean) - Current tournament
      - `created_at` (timestamptz)
    
    - `lineups`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - References auth.users
      - `tournament_id` (uuid) - References tournaments
      - `formation` (jsonb) - Stores complete lineup structure
      - `captain_player_id` (uuid) - References players
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `matchday_results`
      - `id` (uuid, primary key)
      - `tournament_id` (uuid) - References tournaments
      - `player_id` (uuid) - References players
      - `atp_points_earned` (integer) - Real tennis points earned
      - `matches_played` (integer)
      - `created_at` (timestamptz)
    
    - `standings`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - References auth.users
      - `team_name` (text)
      - `total_points` (integer) - Season points
      - `matches_won` (integer)
      - `matches_drawn` (integer)
      - `matches_lost` (integer)
      - `budget_remaining` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their data
*/

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tour text NOT NULL CHECK (tour IN ('ATP', 'WTA')),
  ranking integer NOT NULL,
  price integer NOT NULL,
  total_points integer DEFAULT 0,
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- Create user_squads table
CREATE TABLE IF NOT EXISTS user_squads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  acquired_at timestamptz DEFAULT now(),
  UNIQUE(user_id, player_id)
);

-- Create tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('SLAM', 'MASTER1000', 'ATP250')),
  week_number integer NOT NULL,
  start_date date NOT NULL,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create lineups table
CREATE TABLE IF NOT EXISTS lineups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  formation jsonb NOT NULL,
  captain_player_id uuid REFERENCES players(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tournament_id)
);

-- Create matchday_results table
CREATE TABLE IF NOT EXISTS matchday_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  atp_points_earned integer DEFAULT 0,
  matches_played integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tournament_id, player_id)
);

-- Create standings table
CREATE TABLE IF NOT EXISTS standings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_name text NOT NULL,
  total_points integer DEFAULT 0,
  matches_won integer DEFAULT 0,
  matches_drawn integer DEFAULT 0,
  matches_lost integer DEFAULT 0,
  budget_remaining integer DEFAULT 1000,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchday_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE standings ENABLE ROW LEVEL SECURITY;

-- Policies for players (public read, admin write)
CREATE POLICY "Anyone can view players"
  ON players FOR SELECT
  TO authenticated
  USING (true);

-- Policies for user_squads
CREATE POLICY "Users can view their own squad"
  ON user_squads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own squad"
  ON user_squads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own squad"
  ON user_squads FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for tournaments (public read)
CREATE POLICY "Anyone can view tournaments"
  ON tournaments FOR SELECT
  TO authenticated
  USING (true);

-- Policies for lineups
CREATE POLICY "Users can view their own lineups"
  ON lineups FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lineups"
  ON lineups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lineups"
  ON lineups FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for matchday_results (public read)
CREATE POLICY "Anyone can view matchday results"
  ON matchday_results FOR SELECT
  TO authenticated
  USING (true);

-- Policies for standings (public read, own write)
CREATE POLICY "Anyone can view standings"
  ON standings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own standing"
  ON standings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own standing"
  ON standings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_players_tour ON players(tour);
CREATE INDEX IF NOT EXISTS idx_players_ranking ON players(ranking);
CREATE INDEX IF NOT EXISTS idx_user_squads_user_id ON user_squads(user_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_is_active ON tournaments(is_active);
CREATE INDEX IF NOT EXISTS idx_lineups_user_tournament ON lineups(user_id, tournament_id);
CREATE INDEX IF NOT EXISTS idx_standings_total_points ON standings(total_points DESC);