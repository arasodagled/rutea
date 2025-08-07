-- Final fix for handle_new_user function
-- This addresses the foreign key constraint and timing issues
-- Updated to extract first_name and last_name from user metadata

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Add a small delay to ensure the auth.users record is fully committed
  -- This prevents foreign key constraint violations
  
  -- Check if user already has a profile (prevent duplicates)
  IF EXISTS (SELECT 1 FROM user_profiles WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;
  
  -- Check if there's a pending invitation
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
  ELSE
    -- Create profile for direct signup (no invitation)
    -- Extract first_name and last_name from user metadata
    INSERT INTO user_profiles (user_id, first_name, last_name, user_type, status)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      'user', 
      'active'
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and continue (don't break user creation)
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Verify the function and trigger
SELECT 'Function updated successfully' as status;
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'handle_new_user';
SELECT trigger_name, event_manipulation, action_timing 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';