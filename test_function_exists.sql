-- Test if the get_user_profiles_with_emails function exists
SELECT 
  proname as function_name,
  pg_get_function_result(oid) as return_type,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'get_user_profiles_with_emails';

-- Test calling the function (run this only if you're an admin)
-- SELECT * FROM get_user_profiles_with_emails();

-- Check if there are any RLS policies blocking the function
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'user_profiles';