/*
  # Add anonymous access to players table

  1. Changes
    - Add policy for anonymous users to view players
    - Allows the app to work in development mode without authentication

  2. Security
    - Players are read-only public data
    - No sensitive information exposed
*/

CREATE POLICY "Anonymous users can view players"
  ON players
  FOR SELECT
  TO anon
  USING (true);
