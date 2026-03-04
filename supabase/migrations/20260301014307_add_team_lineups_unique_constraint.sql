/*
  # Add unique constraint to team_lineups

  1. Changes
    - Add unique constraint on (team_id, tournament_id) to prevent duplicate lineups
    - This ensures each team can only have one lineup per tournament

  2. Security
    - No changes to RLS policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'team_lineups_team_id_tournament_id_key'
  ) THEN
    ALTER TABLE team_lineups
    ADD CONSTRAINT team_lineups_team_id_tournament_id_key
    UNIQUE (team_id, tournament_id);
  END IF;
END $$;