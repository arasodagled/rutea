-- Update trigger to not create profiles for invited users (they're already created)
CREATE OR REPLACE FUNCTION handle_invitation_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Only handle direct signups (not invited users)
  IF NOT EXISTS (SELECT 1 FROM user_invitations WHERE email = NEW.email AND status = 'pending') THEN
    -- Create profile for direct signup (no invitation)
    INSERT INTO user_profiles (user_id, first_name, last_name, user_type, status)
    VALUES (NEW.id, '', '', 'user', 'pending');
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_invitation_signup: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;