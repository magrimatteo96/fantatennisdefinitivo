/*
  # Create Mock User for Development Testing

  1. Purpose
    - Insert a mock user with ID '00000000-0000-0000-0000-000000000001' into auth.users
    - This allows the "Generate Test Team" feature to work without authentication
    - Enables development and testing without requiring login

  2. Changes
    - Insert mock user into auth.users table
    - Set basic user metadata (email, encrypted password placeholder)
    - Use confirmed status to avoid email verification issues

  3. Security Notes
    - This is a development/testing convenience only
    - The mock user has a known UUID that can be used in RLS policies
    - In production, this user would not exist and proper auth would be required
*/

-- Insert mock user into auth.users table
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  email_change_token_current,
  email_change_confirm_status,
  reauthentication_token,
  is_sso_user
)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'test-user@fantasy-tennis.dev',
  '$2a$10$AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', -- Placeholder encrypted password
  NOW(),
  '',
  '',
  '',
  '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Test User"}'::jsonb,
  false,
  NOW(),
  NOW(),
  '',
  0,
  '',
  false
)
ON CONFLICT (id) DO NOTHING; -- Don't fail if user already exists
