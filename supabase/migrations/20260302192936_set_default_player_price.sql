/*
  # Set Default Player Price

  1. Changes
    - Update all existing players to have price = 50 if null
    - Set default value for price column to 50
    
  2. Purpose
    - Ensure all players have a price value
    - New players will automatically get price = 50
*/

-- Update existing players with null price to 50
UPDATE players SET price = 50 WHERE price IS NULL OR price = 100;

-- Set default value for future inserts
ALTER TABLE players ALTER COLUMN price SET DEFAULT 50;
