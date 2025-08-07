-- Diagnostic script to check database configuration
-- Run this in Supabase SQL Editor to diagnose the "Database error saving user" issue

-- 1. Check if handle_new_user function exists and is properly configured
SELECT 
  proname as function_name,
  prosecdef as security_definer,
  provolatile as volatility
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 2. Check if the trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 3. Check current RLS policies on user_profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- 4. Check if user_profiles table structure is correct
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- 5. Test if we can manually insert a profile (this should work if policies are correct)
-- Note: This is just a test query, don't actually run the INSERT
-- INSERT INTO user_profiles (user_id, first_name, last_name, user_type) 
-- VALUES ('00000000-0000-0000-0000-000000000000', 'Test', 'User', 'user');

-- 6. Check if there are any conflicting policies
SELECT COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'user_profiles' AND cmd = 'INSERT';

-- 7. Check auth.users table permissions (should be accessible by triggers)
SELECT has_table_privilege('auth.users', 'SELECT') as can_read_auth_users;

-- 8. Verify user_invitations table exists and is accessible
SELECT COUNT(*) as invitation_count
FROM user_invitations;

SELECT 'Diagnostic complete. Review the results above.' as status;