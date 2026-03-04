/*
  # Grant RPC Permissions to Anonymous Users

  1. Changes
    - Grant EXECUTE permission on `get_team_opponents_in_tournament` to anon role
    - This allows unauthenticated users to call this function during development

  2. Security
    - This is for development only
    - In production, proper authentication should be enforced
*/

GRANT EXECUTE ON FUNCTION get_team_opponents_in_tournament TO anon;
