-- Complete fix for invitation flow
-- This replaces all previous functions with a single, robust solution

-- 1. Drop existing conflicting functions and triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_invitation_signup();
DROP FUNCTION IF EXISTS handle_new_user();

-- 2. Create a single, comprehensive function
CREATE OR REPLACE FUNCTION handle_user_signup()
RETURNS TRIGGER AS $$
DECLARE
    invitation_record RECORD;
    profile_exists BOOLEAN;
BEGIN
    -- Check if profile already exists (prevent duplicates)
    SELECT EXISTS(SELECT 1 FROM user_profiles WHERE user_id = NEW.id) INTO profile_exists;
    
    IF profile_exists THEN
        RETURN NEW;
    END IF;
    
    -- Check for pending invitation
    SELECT * INTO invitation_record 
    FROM user_invitations 
    WHERE email = NEW.email AND status = 'pending'
    LIMIT 1;
    
    IF FOUND THEN
        -- Invitation-based signup
        INSERT INTO user_profiles (
            user_id, 
            first_name, 
            last_name, 
            user_type, 
            status,
            is_first_login
        ) VALUES (
            NEW.id,
            COALESCE(invitation_record.first_name, ''),
            COALESCE(invitation_record.last_name, ''),
            'user',
            'pending',  -- Keep as pending until password is set
            true
        );
        
        -- DON'T update invitation status here - let the frontend do it
        -- This prevents race conditions with the invitation acceptance flow
        
    ELSE
        -- Direct signup (no invitation)
        INSERT INTO user_profiles (
            user_id, 
            first_name, 
            last_name, 
            user_type, 
            status,
            is_first_login
        ) VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
            COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
            'user',
            'active',
            true
        );
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't break user creation
        RAISE LOG 'Error in handle_user_signup for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_user_signup();

-- 4. Fix RLS policies to allow the function to work
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON user_profiles;

CREATE POLICY "Enable profile creation" ON user_profiles
    FOR INSERT WITH CHECK (true);

-- 5. Verify everything is set up correctly
SELECT 'Database functions reset successfully' as status;

SELECT 
    proname as function_name,
    prosecdef as security_definer
FROM pg_proc 
WHERE proname = 'handle_user_signup';

SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';