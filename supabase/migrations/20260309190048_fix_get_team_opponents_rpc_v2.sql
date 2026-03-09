/*
  # Fix get_team_opponents_in_tournament RPC Function (v2)

  1. Changes
    - Update function to work with actual matchups table schema
    - Calculate championship points from scores (win=3, draw=1, loss=0)
    - Return complete opponent information

  2. Schema
    - matchups table has: id, tournament_id, home_team_id, away_team_id, home_score, away_score, is_completed
    - Championship points calculated: winner gets 3, loser gets 0, draw gives 1 to each
*/

-- Drop the old function
DROP FUNCTION IF EXISTS get_team_opponents_in_tournament(uuid, uuid);

-- Create the updated function
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
    COALESCE(m.home_score::integer, 0) as my_score,
    COALESCE(m.away_score::integer, 0) as opponent_score,
    CASE 
      WHEN m.is_completed AND m.home_score > m.away_score THEN 3
      WHEN m.is_completed AND m.home_score = m.away_score THEN 1
      ELSE 0
    END as my_championship_points,
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
    COALESCE(m.away_score::integer, 0) as my_score,
    COALESCE(m.home_score::integer, 0) as opponent_score,
    CASE 
      WHEN m.is_completed AND m.away_score > m.home_score THEN 3
      WHEN m.is_completed AND m.away_score = m.home_score THEN 1
      ELSE 0
    END as my_championship_points,
    COALESCE(m.is_completed, false) as is_completed
  FROM matchups m
  JOIN league_teams t ON t.id = m.home_team_id
  WHERE m.away_team_id = p_team_id 
    AND m.tournament_id = p_tournament_id
  
  ORDER BY matchup_id;
END;
$$;
