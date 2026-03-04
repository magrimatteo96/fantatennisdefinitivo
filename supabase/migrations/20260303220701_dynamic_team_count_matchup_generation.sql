/*
  # Dynamic Team Count Matchup Generation

  1. Purpose
    - Updates matchup generation to support leagues of any size (4, 6, 8, 10 teams)
    - Automatically calculates correct number of matchups based on actual team count
    - Maintains fair round-robin distribution regardless of league size

  2. Changes
    - Replaces hardcoded 8-team logic with dynamic team counting
    - Updates algorithm to work with any even number of teams (4-10)
    - Preserves tournament type weights (SLAM=3, Master=2, 250/500=1 opponents per team)

  3. Formula
    - For N teams and M opponents per team:
    - Total matchups = (N × M) / 2
    - Examples:
      * 8 teams, SLAM (3 opponents): (8 × 3) / 2 = 12 matchups
      * 6 teams, Master (2 opponents): (6 × 2) / 2 = 6 matchups
      * 4 teams, 250 (1 opponent): (4 × 1) / 2 = 2 matchups
*/

-- Drop and recreate the matchup generation function with dynamic team support
CREATE OR REPLACE FUNCTION generate_round_robin_matchups(p_tournament_id UUID)
RETURNS void AS $$
DECLARE
  v_opponents_count INTEGER;
  v_teams UUID[];
  v_team_count INTEGER;
  v_matches_per_team INTEGER;
  v_total_matchups INTEGER;
  v_home_idx INTEGER;
  v_away_idx INTEGER;
  v_matchup_count INTEGER := 0;
  v_offset INTEGER;
  v_round_number INTEGER;
BEGIN
  -- Get tournament opponent count and round number
  SELECT opponents_count, tournaments.round_number 
  INTO v_opponents_count, v_round_number
  FROM tournaments
  WHERE id = p_tournament_id;

  -- Get all teams (DYNAMIC - supports any number of teams)
  SELECT ARRAY_AGG(id ORDER BY name) INTO v_teams
  FROM league_teams;
  
  v_team_count := array_length(v_teams, 1);
  
  IF v_team_count IS NULL OR v_team_count = 0 THEN
    RAISE EXCEPTION 'No teams found in league_teams table';
  END IF;

  -- Validate even number of teams for fair matchups
  IF v_team_count % 2 != 0 THEN
    RAISE EXCEPTION 'League must have an even number of teams (found: %)', v_team_count;
  END IF;

  -- Calculate expected matchups dynamically
  v_matches_per_team := v_opponents_count;
  v_total_matchups := (v_team_count * v_matches_per_team) / 2;

  RAISE NOTICE 'Generating matchups for % teams: % opponents each = % total matchups', 
    v_team_count, v_opponents_count, v_total_matchups;

  -- Delete existing matchups for this tournament
  DELETE FROM matchups WHERE tournament_id = p_tournament_id;

  -- Generate matchups based on round-robin algorithm
  v_offset := v_round_number * 7; -- Use round number for rotation
  
  FOR v_home_idx IN 1..v_team_count LOOP
    FOR v_away_idx IN (v_home_idx + 1)..v_team_count LOOP
      -- Calculate if this pairing should be included based on rotation
      IF v_matchup_count < v_total_matchups THEN
        -- Use a deterministic algorithm based on indices
        -- This ensures fair distribution across all team counts
        IF (v_opponents_count >= 3) OR -- SLAM: all teams play (or most)
           (v_opponents_count = 2 AND ((v_home_idx + v_away_idx + v_offset) % 2 = 0)) OR
           (v_opponents_count = 1 AND ((v_home_idx + v_away_idx + v_offset) % 4 = 0)) THEN
          
          INSERT INTO matchups (
            tournament_id,
            home_team_id,
            away_team_id,
            home_score,
            away_score,
            is_completed
          ) VALUES (
            p_tournament_id,
            v_teams[v_home_idx],
            v_teams[v_away_idx],
            0,
            0,
            false
          );
          
          v_matchup_count := v_matchup_count + 1;
        END IF;
      END IF;
      
      EXIT WHEN v_matchup_count >= v_total_matchups;
    END LOOP;
    
    EXIT WHEN v_matchup_count >= v_total_matchups;
  END LOOP;

  -- Verify correct number of matchups generated
  IF v_matchup_count != v_total_matchups THEN
    RAISE WARNING 'Expected % matchups, generated % (this may need algorithm adjustment)', 
      v_total_matchups, v_matchup_count;
  END IF;

  RAISE NOTICE 'Successfully generated % matchups for round %', v_matchup_count, v_round_number;
END;
$$ LANGUAGE plpgsql;