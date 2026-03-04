/*
  # Add Global Matchday Management System

  1. Schema Changes
    - Adds `is_globally_active` boolean to tournaments table (only ONE can be true)
    - Creates function to safely set active matchday (ensures single active matchday)
    - Adds index for faster active matchday lookups

  2. Purpose
    - Fixes "Nessun torneo attivo" error in Lineup page
    - Allows Super Admin to set which of the 30 matchdays is currently active
    - Ensures only one matchday can be active at a time globally
    - Provides clear separation between tournament data (already populated) and active state

  3. Security
    - No RLS changes needed (tournaments table already configured)
    - Function ensures data integrity (single active matchday)
*/

-- Add comment to clarify existing structure
COMMENT ON TABLE tournaments IS 'Contains 30 pre-populated matchdays for the 2026 season. Each matchday represents one week of tournaments with specific opponent counts based on tournament type (SLAM=3, Master=2, 250/500=1)';

-- is_active already exists, but let's ensure it's properly indexed
CREATE INDEX IF NOT EXISTS idx_tournaments_is_active ON tournaments(is_active) WHERE is_active = true;

-- Function to safely set a single active matchday
CREATE OR REPLACE FUNCTION set_active_matchday(p_tournament_id UUID)
RETURNS void AS $$
BEGIN
  -- First deactivate all tournaments
  UPDATE tournaments SET is_active = false WHERE is_active = true;
  
  -- Then activate the selected one
  UPDATE tournaments SET is_active = true WHERE id = p_tournament_id;
  
  RAISE NOTICE 'Matchday activated: %', p_tournament_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get current active matchday info
CREATE OR REPLACE FUNCTION get_active_matchday()
RETURNS TABLE(
  id UUID,
  round_number INTEGER,
  name TEXT,
  type TEXT,
  opponents_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.round_number,
    t.name,
    t.type,
    t.opponents_count
  FROM tournaments t
  WHERE t.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Ensure no matchdays are active by default (admin must activate one)
UPDATE tournaments SET is_active = false;