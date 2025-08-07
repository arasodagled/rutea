-- Update database functions to remove 'role' column references
-- This ensures complete consistency after removing the redundant 'role' column

-- Drop existing functions first to avoid signature conflicts
DROP FUNCTION IF EXISTS get_user_profiles_with_emails();
DROP FUNCTION IF EXISTS get_user_profile_with_email(UUID);

-- Update get_user_profiles_with_emails function to remove 'role' column
CREATE OR REPLACE FUNCTION get_user_profiles_with_emails()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  user_type TEXT,
  status TEXT,
  linkedin_url TEXT,
  cv_file_path TEXT,
  cv_file_name TEXT,
  is_first_login BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() AND up.user_type = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Only admins can view user emails';
  END IF;

  -- Return user profiles with emails (without role column)
  RETURN QUERY
  SELECT 
    up.id,
    up.user_id,
    up.first_name,
    up.last_name,
    up.user_type,
    up.status,
    up.linkedin_url,
    up.cv_file_path,
    up.cv_file_name,
    up.is_first_login,
    up.created_at,
    up.updated_at,
    au.email
  FROM user_profiles up
  LEFT JOIN auth.users au ON up.user_id = au.id;
END;
$$;

-- Update get_user_profile_with_email function to remove 'role' column
CREATE OR REPLACE FUNCTION get_user_profile_with_email(target_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  user_type TEXT,
  status TEXT,
  linkedin_url TEXT,
  cv_file_path TEXT,
  cv_file_name TEXT,
  is_first_login BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user can view this profile (own profile or admin)
  IF NOT (
    auth.uid() = target_user_id OR
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() AND up.user_type = 'admin'
    )
  ) THEN
    RAISE EXCEPTION 'Access denied: Cannot view this user profile';
  END IF;

  -- Return user profile with email (without role column)
  RETURN QUERY
  SELECT 
    up.id,
    up.user_id,
    up.first_name,
    up.last_name,
    up.user_type,
    up.status,
    up.linkedin_url,
    up.cv_file_path,
    up.cv_file_name,
    up.is_first_login,
    up.created_at,
    up.updated_at,
    au.email
  FROM user_profiles up
  LEFT JOIN auth.users au ON up.user_id = au.id
  WHERE up.user_id = target_user_id;
END;
$$;

-- Verify the functions were updated
SELECT 
  'Updated functions:' as info,
  proname,
  oidvectortypes(proargtypes) as argument_types
FROM pg_proc 
WHERE proname IN ('get_user_profiles_with_emails', 'get_user_profile_with_email')
ORDER BY proname;

SELECT 'Database functions updated to use only user_type column.' as status;