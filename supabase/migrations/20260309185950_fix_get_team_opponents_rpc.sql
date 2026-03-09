/*
  # Fix get_team_opponents_in_tournament RPC Function

  1. Changes
    - Drop the old function with incorrect parameter names
    - Create new function with correct parameter names (p_team_id, p_tournament_id)
    - Fix the query to properly join with league_teams table
    - Return complete opponent information including scores and matchup details

  2. Returns
    - opponent_id: UUID of the opponent team
    - opponent_name: Name of the opponent team
    - matchup_id: UUID of the matchup
    - is_home: Boolean indicating if the team is home or away
    - my_score: Current score for the team
    - opponent_score: Current score for the opponent
    - my_championship_points: Championship points earned
    - is_completed: Boolean indicating if matchup is completed
*/

-- Drop the old function if it exists
DROP FUNCTION IF EXISTS get_team_opponents_in_tournament(uuid, uuid);
DROP FUNCTION IF EXISTS get_team_opponents_in_tournament(text, text);

-- Create the corrected function
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
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  -- When team is home
  SELECT 
    m.away_team_id as opponent_id,
    t.name as opponent_name,
    m.id as matchup_id,
    true as is_home,
    COALESCE(m.home_score, 0) as my_score,
    COALESCE(m.away_score, 0) as opponent_score,
    COALESCE(m.home_championship_points, 0) as my_championship_points,
    COALESCE(m.is_completed, false) as is_completed
  FROM matchups m
  JOIN league_teams t ON t.id = m.away_team_id
  WHERE m.home_team_id = p_team_id 
    AND m.tournament_id = p_tournament_id
  
  UNION ALL
  
  -- When team is away
  SELECT 
    m.home_team_id as opponent_id,
    t.name as opponent_name,
    m.id as matchup_id,
    false as is_home,
    COALESCE(m.away_score, 0) as my_score,
    COALESCE(m.home_score, 0) as opponent_score,
    COALESCE(m.away_championship_points, 0) as my_championship_points,
    COALESCE(m.is_completed, false) as is_completed
  FROM matchups m
  JOIN league_teams t ON t.id = m.home_team_id
  WHERE m.away_team_id = p_team_id 
    AND m.tournament_id = p_tournament_id
  
  ORDER BY matchup_id;
END;
$$;

-- Grant execute permissions to authenticated and anon users
GRANT EXECUTE ON FUNCTION get_team_opponents_in_tournament(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_opponents_in_tournament(uuid, uuid) TO anon;
