/*
  # Add server-side time function for secure deadline validation

  1. New Functions
    - get_server_time(): Returns current timestamp from server
    - This prevents client-side clock manipulation
    - Used for validating lineup submission deadlines

  2. Security
    - Function is accessible to all authenticated and anonymous users
    - Returns UTC timestamp for consistent timezone handling
*/

-- Function to get current server time
CREATE OR REPLACE FUNCTION get_server_time()
RETURNS timestamptz AS $$
BEGIN
  RETURN NOW();
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant access to all users
GRANT EXECUTE ON FUNCTION get_server_time() TO anon, authenticated;

-- Add comment
COMMENT ON FUNCTION get_server_time() IS 'Returns current server timestamp to prevent client-side clock manipulation for deadline validation';