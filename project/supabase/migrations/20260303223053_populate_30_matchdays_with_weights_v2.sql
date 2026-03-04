/*
  # Populate 30 Matchdays from 2026 Tennis Calendar

  1. Purpose
    - Populates tournaments table with exactly 30 matchdays (Turni) from 2026 season
    - Each matchday has a WEIGHT (opponents_count) that determines:
      * SLAM (Weight 3): 3 opponents per team, 12 lineup slots (5 ATP + 5 WTA + 2 Doubles)
      * MASTER 1000 (Weight 2): 2 opponents per team, 12 lineup slots (5 ATP + 5 WTA + 2 Doubles)
      * 250/500/Misto (Weight 1): 1 opponent per team, 10 lineup slots (4 ATP + 4 WTA + 2 Doubles)

  2. Weight Distribution
    - SLAM (Weight 3): Turno 1, 14, 17, 23 = 4 tournaments
    - MASTER 1000 (Weight 2): Turno 4, 5, 7, 8, 10, 12, 13, 21, 22, 26, 27, 30 = 12 tournaments
    - 250/500/Misto (Weight 1): All others = 14 tournaments
    - Total: 30 matchdays

  3. Active Tournament
    - Only Turno 1 (Australian Open) is active by default
    - Admin can change active matchday via Global Matchdays Manager

  4. Lineup Slots Logic
    - Weight 3 or 2: 12 slots (5+5+2)
    - Weight 1: 10 slots (4+4+2)
*/

-- Clear existing tournaments
TRUNCATE TABLE tournaments CASCADE;

-- Insert all 30 matchdays based on CSV data
INSERT INTO tournaments (round_number, name, type, opponents_count, lineup_slots, is_active, duration_days) VALUES
-- Turno 1: SLAM (Weight 3, 12 slots)
(1, 'Australian Open', 'SLAM (3 Sett)', 3, 12, true, 21),

-- Turno 2-3: 250/Misto (Weight 1, 10 slots)
(2, 'ATP 250', '250', 1, 10, false, 7),
(3, 'ATP/WTA 500-250', 'Misto 500/250', 1, 10, false, 7),

-- Turno 4-5: Master 1000 (Weight 2, 12 slots)
(4, 'Master 1000', 'Master 1000', 2, 12, false, 7),
(5, 'Master 1000', 'Master 1000', 2, 12, false, 7),

-- Turno 6: Misto (Weight 1, 10 slots)
(6, 'ATP/WTA 500-250', 'Misto 500/250', 1, 10, false, 7),

-- Turno 7-8: Master 1000 (Weight 2, 12 slots)
(7, 'Indian Wells', 'MASTER 1000 (12 Giorni)', 2, 12, false, 12),
(8, 'Miami Open', 'MASTER 1000 (12 Giorni)', 2, 12, false, 12),

-- Turno 9: 250 (Weight 1, 10 slots)
(9, 'ATP 250', '250', 1, 10, false, 7),

-- Turno 10: ATP 1000 (Weight 2, 12 slots)
(10, 'Monte Carlo Masters', 'ATP 1000 solo maschi', 2, 12, false, 7),

-- Turno 11: Misto (Weight 1, 10 slots)
(11, 'ATP/WTA 500-250', 'Misto 500/250', 1, 10, false, 7),

-- Turno 12-13: Master 1000 (Weight 2, 12 slots)
(12, 'Madrid Open', 'MASTER 1000 (12 Giorni)', 2, 12, false, 12),
(13, 'Rome Masters', 'MASTER 1000 (12 Giorni)', 2, 12, false, 12),

-- Turno 14: SLAM (Weight 3, 12 slots)
(14, 'Roland Garros', 'SLAM + Lead-up (3 Sett)', 3, 12, false, 21),

-- Turno 15-16: 250/500 (Weight 1, 10 slots)
(15, 'ATP 250', '250', 1, 10, false, 7),
(16, 'ATP/WTA 500', '500', 1, 10, false, 7),

-- Turno 17: SLAM (Weight 3, 12 slots)
(17, 'Wimbledon', 'SLAM (3 Sett)', 3, 12, false, 21),

-- Turno 18-19: 250 (Weight 1, 10 slots)
(18, 'ATP 250', '250', 1, 10, false, 7),
(19, 'ATP 250', '250', 1, 10, false, 7),

-- Turno 20: 500 (Weight 1, 10 slots)
(20, 'ATP/WTA 500', '500', 1, 10, false, 7),

-- Turno 21-22: Master 1000 (Weight 2, 12 slots)
(21, 'Canada Masters', 'MASTER 1000 (12 Giorni)', 2, 12, false, 12),
(22, 'Cincinnati Masters', 'MASTER 1000 (12 Giorni)', 2, 12, false, 12),

-- Turno 23: SLAM (Weight 3, 12 slots)
(23, 'US Open', 'SLAM (2 Sett)', 3, 12, false, 14),

-- Turno 24-25: 250 (Weight 1, 10 slots)
(24, 'WTA 250', '250 solo donne', 1, 10, false, 7),
(25, 'ATP 250', '250', 1, 10, false, 7),

-- Turno 26-27: Master 1000 (Weight 2, 12 slots)
(26, 'Master 1000', 'MASTER 1000', 2, 12, false, 7),
(27, 'Shanghai Masters', 'MASTER 1000 (12 Giorni)', 2, 12, false, 12),

-- Turno 28: 250 (Weight 1, 10 slots)
(28, 'ATP 250', '250', 1, 10, false, 7),

-- Turno 29: 500 (Weight 1, 10 slots)
(29, 'ATP/WTA 500', '500', 1, 10, false, 7),

-- Turno 30: Master 1000 (Weight 2, 12 slots)
(30, 'Paris Masters', 'MASTER 1000', 2, 12, false, 7);

-- Verify insertion
DO $$
DECLARE
  total_count INTEGER;
  slam_count INTEGER;
  master_count INTEGER;
  other_count INTEGER;
  active_tournament TEXT;
BEGIN
  SELECT COUNT(*) INTO total_count FROM tournaments;
  SELECT COUNT(*) INTO slam_count FROM tournaments WHERE opponents_count = 3;
  SELECT COUNT(*) INTO master_count FROM tournaments WHERE opponents_count = 2;
  SELECT COUNT(*) INTO other_count FROM tournaments WHERE opponents_count = 1;
  SELECT name INTO active_tournament FROM tournaments WHERE is_active = true LIMIT 1;
  
  RAISE NOTICE '✅ Total matchdays inserted: %', total_count;
  RAISE NOTICE '🏆 SLAM tournaments (Weight 3, 12 slots): % matchdays', slam_count;
  RAISE NOTICE '⭐ Master 1000 (Weight 2, 12 slots): % matchdays', master_count;
  RAISE NOTICE '🎾 250/500 tournaments (Weight 1, 10 slots): % matchdays', other_count;
  RAISE NOTICE '🔥 Active tournament: %', active_tournament;
  
  IF total_count != 30 THEN
    RAISE EXCEPTION 'Expected 30 tournaments, got %', total_count;
  END IF;
  
  IF slam_count != 4 THEN
    RAISE WARNING 'Expected 4 SLAM tournaments, got %', slam_count;
  END IF;
  
  IF master_count != 12 THEN
    RAISE WARNING 'Expected 12 Master 1000 tournaments, got %', master_count;
  END IF;
  
  IF other_count != 14 THEN
    RAISE WARNING 'Expected 14 250/500 tournaments, got %', other_count;
  END IF;
END $$;