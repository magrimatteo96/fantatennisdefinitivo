/*
  # Update Tournament Type Constraint

  1. Purpose
    - Removes restrictive type constraint to allow detailed tournament descriptions from CSV
    - Allows types like "SLAM (3 Sett)", "MASTER 1000 (12 Giorni)", "Misto 500/250", etc.
    - The weight logic is now based on opponents_count field, not type string

  2. Changes
    - Drops old type check constraint
    - Type field now accepts any text value for descriptive tournament names
*/

-- Drop the restrictive type constraint
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_type_check;

-- Add comment to clarify type field usage
COMMENT ON COLUMN tournaments.type IS 'Tournament type description (free text). Weight/opponents determined by opponents_count field: 1=250/500, 2=Master1000, 3=SLAM';