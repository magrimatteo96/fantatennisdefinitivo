/*
  # Add Fixed Ranking to Players

  1. Changes
    - Add `fixed_ranking` column to `players` table
      - `fixed_ranking` (integer): The official ranking at the start of the season, frozen for the entire season
      - This value is used for auction and lineup positioning rules
      - Unlike `ranking`, this value never changes during the season
    
  2. Data Migration
    - Copy current `ranking` values to `fixed_ranking` for all existing players
    - This ensures backward compatibility
*/

-- Add fixed_ranking column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'fixed_ranking'
  ) THEN
    ALTER TABLE players ADD COLUMN fixed_ranking integer;
  END IF;
END $$;

-- Populate fixed_ranking with current ranking values
UPDATE players
SET fixed_ranking = ranking
WHERE fixed_ranking IS NULL;

-- Add NOT NULL constraint after populating
ALTER TABLE players ALTER COLUMN fixed_ranking SET NOT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_players_fixed_ranking ON players(fixed_ranking);
CREATE INDEX IF NOT EXISTS idx_players_tour_fixed_ranking ON players(tour, fixed_ranking);