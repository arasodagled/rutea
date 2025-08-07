-- Function specifically for invitation-based signups
CREATE OR REPLACE FUNCTION handle_invitation_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Only handle invitation-based signups
  IF EXISTS (SELECT 1 FROM user_invitations WHERE email = NEW.email AND status = 'pending') THEN
    -- Create profile with invitation data
    INSERT INTO user_profiles (user_id, first_name, last_name, user_type, status)
    SELECT 
      NEW.id,
      COALESCE(ui.first_name, ''),
      COALESCE(ui.last_name, ''),
      COALESCE(ui.role, 'user'),
      'active'
    FROM user_invitations ui
    WHERE ui.email = NEW.email AND ui.status = 'pending'
    LIMIT 1;
    
    -- Update invitation status
    UPDATE user_invitations 
    SET status = 'accepted', updated_at = NOW()
    WHERE email = NEW.email AND status = 'pending';
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_invitation_signup: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the trigger to use the new function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_invitation_signup();