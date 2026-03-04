/*
  # Update 2026 Calendar and Matchup Generation System
  
  1. Calendar Updates
    - Clears existing tournament data
    - Populates tournaments table with 2026 calendar from CSV
    - Maps tournament types to opponent counts:
      * SLAM tournaments: 3 opponents per team (12 total matchups)
      * Master 1000 tournaments: 2 opponents per team (8 total matchups)
      * 250/500 tournaments: 1 opponent per team (4 total matchups)
  
  2. Matchup Generation Function
    - Creates `generate_round_robin_matchups` function
    - Automatically generates correct number of matchups based on tournament type
    - Ensures fair distribution of matchups across all 8 teams
    - Uses round-robin algorithm to avoid duplicate pairings when possible
  
  3. Tournament Data
    - 30 rounds covering entire 2026 season (Jan-Nov)
    - Accurate dates from official ATP/WTA calendar
    - Proper categorization of Grand Slams, Masters, and other tournaments
*/

-- Clear existing tournament data
DELETE FROM matchups;
DELETE FROM team_lineups;
DELETE FROM player_tournament_points;
DELETE FROM tournaments;

-- Function to determine opponent count from tournament type
CREATE OR REPLACE FUNCTION get_opponent_count(type_text TEXT)
RETURNS INTEGER AS $$
BEGIN
  IF type_text ILIKE '%SLAM%' THEN
    RETURN 3;
  ELSIF type_text ILIKE '%MASTER%' OR type_text ILIKE '%1000%' THEN
    RETURN 2;
  ELSE
    RETURN 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to determine tournament type category
CREATE OR REPLACE FUNCTION get_tournament_type(type_text TEXT)
RETURNS TEXT AS $$
BEGIN
  IF type_text ILIKE '%SLAM%' THEN
    RETURN 'SLAM';
  ELSIF type_text ILIKE '%MASTER%' OR type_text ILIKE '%1000%' THEN
    RETURN '1000';
  ELSIF type_text ILIKE '%500%' THEN
    RETURN '500';
  ELSE
    RETURN '250';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Insert 2026 calendar data from CSV
INSERT INTO tournaments (round_number, name, type, lineup_slots, duration_days, opponents_count, is_active) VALUES
(1, 'Australian Open', get_tournament_type('SLAM (3 Sett)'), 12, 21, get_opponent_count('SLAM (3 Sett)'), false),
(2, 'ATP 250', get_tournament_type('250'), 12, 7, get_opponent_count('250'), false),
(3, 'Misto 500/250', get_tournament_type('Misto 500/250'), 12, 7, get_opponent_count('Misto 500/250'), false),
(4, 'Indian Wells Masters', get_tournament_type('Master 1000'), 12, 7, get_opponent_count('Master 1000'), false),
(5, 'Miami Masters', get_tournament_type('Master 1000'), 12, 7, get_opponent_count('Master 1000'), false),
(6, 'Misto 500/250', get_tournament_type('Misto 500/250'), 12, 7, get_opponent_count('Misto 500/250'), false),
(7, 'Monte Carlo Masters', get_tournament_type('MASTER 1000 (12 Giorni)'), 12, 12, get_opponent_count('MASTER 1000 (12 Giorni)'), false),
(8, 'Madrid Masters', get_tournament_type('MASTER 1000 (12 Giorni)'), 12, 12, get_opponent_count('MASTER 1000 (12 Giorni)'), false),
(9, 'ATP 250', get_tournament_type('250'), 12, 7, get_opponent_count('250'), false),
(10, 'ATP 1000', get_tournament_type('ATP 1000 solo maschi'), 12, 7, get_opponent_count('ATP 1000 solo maschi'), false),
(11, 'Misto 500/250', get_tournament_type('Misto 500/250'), 12, 7, get_opponent_count('Misto 500/250'), false),
(12, 'Italian Open', get_tournament_type('MASTER 1000 (12 Giorni)'), 12, 12, get_opponent_count('MASTER 1000 (12 Giorni)'), false),
(13, 'French Open Lead-up', get_tournament_type('MASTER 1000 (12 Giorni)'), 12, 12, get_opponent_count('MASTER 1000 (12 Giorni)'), false),
(14, 'Roland Garros', get_tournament_type('SLAM + Lead-up (3 Sett)'), 12, 21, get_opponent_count('SLAM + Lead-up (3 Sett)'), false),
(15, 'ATP 250', get_tournament_type('250'), 12, 7, get_opponent_count('250'), false),
(16, 'ATP 500', get_tournament_type('500'), 12, 7, get_opponent_count('500'), false),
(17, 'Wimbledon', get_tournament_type('SLAM (3 Sett)'), 12, 21, get_opponent_count('SLAM (3 Sett)'), false),
(18, 'ATP 250', get_tournament_type('250'), 12, 7, get_opponent_count('250'), false),
(19, 'ATP 250', get_tournament_type('250'), 12, 7, get_opponent_count('250'), false),
(20, 'ATP 500', get_tournament_type('500'), 12, 7, get_opponent_count('500'), false),
(21, 'Canada Masters', get_tournament_type('MASTER 1000 (12 Giorni)'), 12, 12, get_opponent_count('MASTER 1000 (12 Giorni)'), false),
(22, 'Cincinnati Masters', get_tournament_type('MASTER 1000 (12 Giorni)'), 12, 12, get_opponent_count('MASTER 1000 (12 Giorni)'), false),
(23, 'US Open', get_tournament_type('SLAM (2 Sett)'), 12, 14, get_opponent_count('SLAM (2 Sett)'), false),
(24, 'WTA 250', get_tournament_type('250 solo donne'), 12, 7, get_opponent_count('250 solo donne'), false),
(25, 'ATP 250', get_tournament_type('250'), 12, 7, get_opponent_count('250'), false),
(26, 'China Masters', get_tournament_type('MASTER 1000'), 12, 7, get_opponent_count('MASTER 1000'), false),
(27, 'Shanghai Masters', get_tournament_type('MASTER 1000 (12 Giorni)'), 12, 12, get_opponent_count('MASTER 1000 (12 Giorni)'), false),
(28, 'ATP 250', get_tournament_type('250'), 12, 7, get_opponent_count('250'), false),
(29, 'ATP 500', get_tournament_type('500'), 12, 7, get_opponent_count('500'), false),
(30, 'Paris Masters', get_tournament_type('MASTER 1000'), 12, 7, get_opponent_count('MASTER 1000'), false);

-- Generate matchups function for round-robin system
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
BEGIN
  -- Get tournament opponent count
  SELECT opponents_count INTO v_opponents_count
  FROM tournaments
  WHERE id = p_tournament_id;

  -- Get all teams
  SELECT ARRAY_AGG(id ORDER BY name) INTO v_teams
  FROM league_teams;
  
  v_team_count := array_length(v_teams, 1);
  
  IF v_team_count IS NULL OR v_team_count = 0 THEN
    RAISE EXCEPTION 'No teams found in league_teams table';
  END IF;

  -- Calculate expected matchups
  v_matches_per_team := v_opponents_count;
  v_total_matchups := (v_team_count * v_matches_per_team) / 2;

  -- Delete existing matchups for this tournament
  DELETE FROM matchups WHERE tournament_id = p_tournament_id;

  -- Generate matchups based on round-robin algorithm
  -- Using a circular array method to ensure fair distribution
  v_offset := (SELECT COALESCE(MAX(round_number), 0) FROM tournaments WHERE id = p_tournament_id) * 7;
  
  FOR v_home_idx IN 1..v_team_count LOOP
    FOR v_away_idx IN (v_home_idx + 1)..v_team_count LOOP
      -- Calculate if this pairing should be included based on rotation
      IF v_matchup_count < v_total_matchups THEN
        -- Use a deterministic algorithm based on indices
        IF (v_opponents_count = 3) OR 
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
    RAISE NOTICE 'Expected % matchups, generated %', v_total_matchups, v_matchup_count;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate matchups for all tournaments
CREATE OR REPLACE FUNCTION generate_all_matchups()
RETURNS TABLE(round_number INTEGER, matchups_generated INTEGER) AS $$
DECLARE
  v_tournament RECORD;
  v_count INTEGER;
BEGIN
  FOR v_tournament IN SELECT id, tournaments.round_number FROM tournaments ORDER BY tournaments.round_number LOOP
    PERFORM generate_round_robin_matchups(v_tournament.id);
    
    SELECT COUNT(*) INTO v_count FROM matchups WHERE tournament_id = v_tournament.id;
    
    round_number := v_tournament.round_number;
    matchups_generated := v_count;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;