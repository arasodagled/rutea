-- Fix for handle_new_user function to support direct signups
-- Run this in Supabase SQL Editor to fix the "Database error saving user" issue

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there's a pending invitation
  IF EXISTS (SELECT 1 FROM user_invitations WHERE email = NEW.email AND status = 'pending') THEN
    -- Create profile with invitation data
    INSERT INTO user_profiles (user_id, first_name, last_name)
    SELECT 
      NEW.id,
      COALESCE(ui.first_name, ''),
      COALESCE(ui.last_name, '')
    FROM user_invitations ui
    WHERE ui.email = NEW.email AND ui.status = 'pending'
    LIMIT 1;
    
    -- Update invitation status
    UPDATE user_invitations 
    SET status = 'accepted', updated_at = NOW()
    WHERE email = NEW.email AND status = 'pending';
  ELSE
    -- Create profile for direct signup (no invitation)
    INSERT INTO user_profiles (user_id, first_name, last_name, user_type)
    VALUES (NEW.id, '', '', 'user');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the function was updated
SELECT proname, prosrc FROM pg_proc WHERE proname = 'handle_new_user';