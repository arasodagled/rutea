-- Fix RLS policies to allow handle_new_user function to work properly
-- Run this in Supabase SQL Editor to fix the "Database error saving user" issue

-- Drop the existing INSERT policy that's causing issues
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Create a new INSERT policy that allows public registration
CREATE POLICY "Allow profile creation" ON user_profiles
  FOR INSERT WITH CHECK (
    -- Allow profile creation for any user during signup process
    -- This enables public registration without requiring existing permissions
    true
  );

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'user_profiles' AND policyname = 'Allow profile creation';