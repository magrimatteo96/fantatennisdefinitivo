/*
  # Add Reserves System to Team Lineups

  1. Purpose
    - Extend the player_ids JSONB column to support reserves for singles and doubles
    - Enable complete bench/substitution system for lineup management
    - Support strategic reserve player management

  2. New JSON Structure
    The player_ids column will now support:
    - reserves_singles_atp: array of 3 player IDs (Priority 1, 2, 3)
    - reserves_singles_wta: array of 3 player IDs (Priority 1, 2, 3)
    - reserves_doubles_atp: object with { puro: player_id, libero: player_id }
    - reserves_doubles_wta: object with { pura: player_id, libera: player_id }

  3. Validation Rules (enforced in application)
    - Singles reserves: no ranking order required, can be selected freely
    - Doubles reserves "puro/pura": MUST NOT be in "Gruppo Singolaristi" (singles starters + singles reserves)
    - Doubles reserves "libero/libera": can be chosen freely, even from Gruppo Singolaristi
    - No player can occupy multiple slots

  4. Notes
    - This is a schema-compatible change, no data migration needed
    - Existing lineups will continue to work with their current structure
    - New fields are optional and will be validated in the application layer
*/

-- No database changes needed!
-- The player_ids column is already JSONB and can accommodate the new structure
-- We're just documenting the extended schema here

-- Example of the new structure:
/*
{
  "singles_atp": ["player-id-1", "player-id-2", "player-id-3", "player-id-4", "player-id-5"],
  "singles_wta": ["player-id-1", "player-id-2", "player-id-3", "player-id-4", "player-id-5"],
  "doubles": [
    {"atp": "player-id-x", "wta": "player-id-y"},
    {"atp": "player-id-z", "wta": "player-id-w"}
  ],
  "captain_id": "player-id-captain",
  "reserves_singles_atp": ["reserve-1", "reserve-2", "reserve-3"],
  "reserves_singles_wta": ["reserve-1", "reserve-2", "reserve-3"],
  "reserves_doubles_atp": {
    "puro": "doppista-puro-id",
    "libero": "doppista-libero-id"
  },
  "reserves_doubles_wta": {
    "pura": "doppista-pura-id",
    "libera": "doppista-libera-id"
  }
}
*/

-- Add a comment to document the extended structure
COMMENT ON COLUMN team_lineups.player_ids IS 'JSONB structure containing: singles_atp[], singles_wta[], doubles[{atp,wta}], captain_id, reserves_singles_atp[], reserves_singles_wta[], reserves_doubles_atp{puro,libero}, reserves_doubles_wta{pura,libera}';
