-- Cleanup script to remove redundant 'role' column from user_profiles
-- This ensures consistency by using only 'user_type' throughout the application

-- First, migrate any existing data from 'role' to 'user_type' if needed
UPDATE user_profiles 
SET user_type = COALESCE(role, user_type, 'user')
WHERE user_type IS NULL OR user_type = '';

-- Verify the data migration
SELECT 
  'Data before cleanup:' as info,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN role IS NOT NULL AND role != '' THEN 1 END) as profiles_with_role,
  COUNT(CASE WHEN user_type IS NOT NULL AND user_type != '' THEN 1 END) as profiles_with_user_type
FROM user_profiles;

-- Show any profiles where role and user_type differ (for review)
SELECT 
  'Profiles with different role/user_type:' as info,
  user_id,
  first_name,
  last_name,
  role,
  user_type
FROM user_profiles 
WHERE role IS NOT NULL 
  AND user_type IS NOT NULL 
  AND role != user_type
  AND role != ''
  AND user_type != '';

-- Drop the redundant 'role' column
ALTER TABLE user_profiles DROP COLUMN IF EXISTS role;

-- Verify the column was dropped
SELECT 
  'Columns after cleanup:' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Update any functions that might reference the 'role' column
-- Check if get_user_profiles_with_emails function needs updating
SELECT 
  'Function definition check:' as info,
  proname,
  prosrc
FROM pg_proc 
WHERE proname = 'get_user_profiles_with_emails';

SELECT 'Role column cleanup completed. All authentication should now use user_type consistently.' as status;