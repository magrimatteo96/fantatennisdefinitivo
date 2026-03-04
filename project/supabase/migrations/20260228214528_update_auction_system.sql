/*
  # Update Auction System

  1. Changes
    - Update players table: Set all prices to 1 (base price)
    - Add auction_price column to user_squads table to store actual paid price
    - Update budget calculation logic to use auction prices

  2. Details
    - All players now have base price = 1
    - user_squads.auction_price stores the actual amount paid in auction
    - Budget tracking now based on sum of auction_price values
*/

-- Add auction_price column to user_squads if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_squads' AND column_name = 'auction_price'
  ) THEN
    ALTER TABLE user_squads ADD COLUMN auction_price integer NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Update all existing players to have price = 1
UPDATE players SET price = 1;

-- Create index on player name for faster searches
CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);
CREATE INDEX IF NOT EXISTS idx_players_tour_ranking ON players(tour, ranking);