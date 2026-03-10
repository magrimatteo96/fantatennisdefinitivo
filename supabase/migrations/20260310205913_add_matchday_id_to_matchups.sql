/*
  # Add matchday_id to matchups for simultaneous match grouping

  1. Changes
    - Add matchday_id UUID field to matchups table
    - This allows grouping multiple matchups that happen simultaneously
    - For SLAM tournaments (opponents_count=3), all 3 matchups for a team will share the same matchday_id
    - For regular tournaments, matchday_id can be null or same as matchup id

  2. Purpose
    - Enable proper tracking of simultaneous challenges in Slam tournaments
    - Allow closing all related matchups together when a round completes
    - Support dashboard display of all opponents in the same round
*/

-- Add matchday_id to matchups table
ALTER TABLE matchups ADD COLUMN IF NOT EXISTS matchday_id uuid;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_matchups_matchday_id ON matchups(matchday_id);

-- Add comment
COMMENT ON COLUMN matchups.matchday_id IS 'Groups simultaneous matchups together. For SLAM tournaments, all 3 matchups for a team share the same matchday_id';