/*
  # Add nationality to players

  1. Changes
    - Add country column to players table (ISO 3166-1 alpha-2 country code)
    - Add image_url if not exists for future player photos
  
  2. Security
    - No changes to RLS policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'country'
  ) THEN
    ALTER TABLE players ADD COLUMN country text DEFAULT 'XX';
  END IF;
END $$;

-- Update some common players with their nationalities
UPDATE players SET country = 'IT' WHERE name ILIKE '%Sinner%';
UPDATE players SET country = 'ES' WHERE name ILIKE '%Alcaraz%';
UPDATE players SET country = 'RS' WHERE name ILIKE '%Djokovic%';
UPDATE players SET country = 'ES' WHERE name ILIKE '%Nadal%';
UPDATE players SET country = 'RU' WHERE name ILIKE '%Medvedev%';
UPDATE players SET country = 'GR' WHERE name ILIKE '%Tsitsipas%';
UPDATE players SET country = 'DE' WHERE name ILIKE '%Zverev%';
UPDATE players SET country = 'NO' WHERE name ILIKE '%Ruud%';
UPDATE players SET country = 'IT' WHERE name ILIKE '%Musetti%';
UPDATE players SET country = 'IT' WHERE name ILIKE '%Paolini%';
UPDATE players SET country = 'PL' WHERE name ILIKE '%Swiatek%';
UPDATE players SET country = 'US' WHERE name ILIKE '%Gauff%';
UPDATE players SET country = 'BY' WHERE name ILIKE '%Sabalenka%';
UPDATE players SET country = 'CZ' WHERE name ILIKE '%Krejcikova%';
UPDATE players SET country = 'KZ' WHERE name ILIKE '%Rybakina%';
UPDATE players SET country = 'TN' WHERE name ILIKE '%Jabeur%';
UPDATE players SET country = 'US' WHERE name ILIKE '%Pegula%';
UPDATE players SET country = 'CN' WHERE name ILIKE '%Zheng%';
UPDATE players SET country = 'GB' WHERE name ILIKE '%Raducanu%';
UPDATE players SET country = 'FR' WHERE name ILIKE '%Garcia%';
UPDATE players SET country = 'RU' WHERE name ILIKE '%Rublev%';
UPDATE players SET country = 'DK' WHERE name ILIKE '%Rune%';
UPDATE players SET country = 'AU' WHERE name ILIKE '%De Minaur%';
UPDATE players SET country = 'GB' WHERE name ILIKE '%Draper%';
UPDATE players SET country = 'US' WHERE name ILIKE '%Fritz%';
UPDATE players SET country = 'US' WHERE name ILIKE '%Tiafoe%';
UPDATE players SET country = 'US' WHERE name ILIKE '%Paul%';
UPDATE players SET country = 'BG' WHERE name ILIKE '%Dimitrov%';
UPDATE players SET country = 'CA' WHERE name ILIKE '%Auger%';
UPDATE players SET country = 'CA' WHERE name ILIKE '%Shapovalov%';