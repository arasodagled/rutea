-- Final fix for RLS policies to resolve "Database error saving new user"
-- This addresses the NULL condition in the "Allow profile creation" policy

-- Drop the problematic policy with NULL condition
DROP POLICY IF EXISTS "Allow profile creation" ON user_profiles;

-- Create a new policy that explicitly allows all insertions
-- This ensures that the handle_new_user() trigger can create profiles
CREATE POLICY "Enable profile creation for all" ON user_profiles
  FOR INSERT
  WITH CHECK (true);

-- Verify the policy was created correctly
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_profiles' AND cmd = 'INSERT';

SELECT 'RLS policies fixed. The handle_new_user() trigger should now work correctly.' as status;