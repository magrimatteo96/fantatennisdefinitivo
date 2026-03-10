/*
  # Add status to tournaments for round lifecycle management

  1. Changes
    - Add status field to tournaments table
    - Values: 'upcoming', 'active', 'completed'
    - Default: 'upcoming'

  2. Purpose
    - Track the lifecycle of each matchday/tournament
    - 'upcoming': Not yet started, lineups can be edited
    - 'active': Tournament in progress (after start_date), lineups locked
    - 'completed': Round closed by admin, scores calculated

  3. Notes
    - This replaces/complements is_active which just marks current focus
    - Admin will change status to 'completed' when closing a round
*/

-- Add status field
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed'));

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);

-- Set initial status based on is_active
UPDATE tournaments 
SET status = CASE 
  WHEN is_active = true THEN 'active'
  ELSE 'upcoming'
END
WHERE status = 'upcoming';

-- Add comment
COMMENT ON COLUMN tournaments.status IS 'Tournament lifecycle: upcoming (can edit lineups), active (started, lineups locked), completed (admin closed, scores calculated)';