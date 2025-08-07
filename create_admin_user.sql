-- Script to create an admin user
-- Run this in Supabase SQL Editor after creating your first user account

-- Replace 'your-email@example.com' with the email of the user you want to make admin
-- This user must already exist in auth.users (they must have signed up first)

UPDATE user_profiles 
SET user_type = 'admin'
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'saradelgado95@gmail.com'
);

-- Verify the admin user was created
SELECT 
  up.user_type,
  up.first_name,
  up.last_name,
  au.email
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
WHERE up.user_type = 'admin';