/*
  # Add Team Roster Management

  1. New Table
    - `team_players`
      - `id` (uuid, primary key)
      - `team_id` (uuid, foreign key to league_teams)
      - `player_id` (uuid, foreign key to players)
      - `auction_price` (integer, price paid at auction)
      - `acquired_at` (timestamp)
      - Unique constraint on (team_id, player_id)
  
  2. Security
    - Enable RLS on team_players table
    - Add policies for viewing and managing team rosters
  
  3. Important Notes
    - Each team can have max 20 players (10 ATP + 10 WTA)
    - Track auction prices for budget management
    - Teams start with 1000 credits
*/

-- Create team_players table
CREATE TABLE IF NOT EXISTS team_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES league_teams(id) ON DELETE CASCADE,
  player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  auction_price integer NOT NULL CHECK (auction_price > 0),
  acquired_at timestamptz DEFAULT now(),
  UNIQUE(team_id, player_id)
);

ALTER TABLE team_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view team rosters"
  ON team_players FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can manage team rosters"
  ON team_players FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_team_players_team ON team_players(team_id);
CREATE INDEX IF NOT EXISTS idx_team_players_player ON team_players(player_id);

-- Add function to calculate team spending
CREATE OR REPLACE FUNCTION get_team_spending(p_team_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(auction_price), 0)::integer
  FROM team_players
  WHERE team_id = p_team_id;
$$;

-- Add function to update team credits based on spending
CREATE OR REPLACE FUNCTION update_team_credits()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE league_teams
  SET credits = 1000 - get_team_spending(COALESCE(NEW.team_id, OLD.team_id))
  WHERE id = COALESCE(NEW.team_id, OLD.team_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to automatically update team credits
DROP TRIGGER IF EXISTS trigger_update_team_credits ON team_players;
CREATE TRIGGER trigger_update_team_credits
AFTER INSERT OR UPDATE OR DELETE ON team_players
FOR EACH ROW
EXECUTE FUNCTION update_team_credits();