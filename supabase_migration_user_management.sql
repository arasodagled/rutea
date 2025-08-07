-- Create user_profiles table to extend auth.users with additional information
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  role TEXT,
  user_type TEXT DEFAULT 'user', -- 'admin', 'user', 'candidate'
  status TEXT DEFAULT 'pending', -- 'pending', 'active', 'inactive', 'completed'
  linkedin_url TEXT,
  cv_file_path TEXT,
  cv_file_name TEXT,
  is_first_login BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create user_invitations table to track invitations
CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'expired'
  invitation_token UUID DEFAULT gen_random_uuid(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile and admins can view all
CREATE POLICY "Users can view profiles" ON user_profiles
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() AND up.user_type = 'admin'
    )
  );

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own profile and admins can update all
CREATE POLICY "Users can update profiles" ON user_profiles
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() AND up.user_type = 'admin'
    )
  );

-- Policy: Only admins can delete profiles
CREATE POLICY "Admins can delete profiles" ON user_profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() AND up.user_type = 'admin'
    )
  );

-- Create RLS policies for user_invitations
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view invitations
CREATE POLICY "Admins can view invitations" ON user_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() AND up.user_type = 'admin'
    )
  );

-- Policy: Only admins can insert invitations
CREATE POLICY "Admins can insert invitations" ON user_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() AND up.user_type = 'admin'
    )
  );

-- Policy: Only admins can update invitations
CREATE POLICY "Admins can update invitations" ON user_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() AND up.user_type = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_type ON user_profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at for user_profiles
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically update updated_at for user_invitations
CREATE TRIGGER update_user_invitations_updated_at
    BEFORE UPDATE ON user_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile after signup
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

-- Create trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to get user profiles with emails (only for admins)
CREATE OR REPLACE FUNCTION get_user_profiles_with_emails()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  role TEXT,
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

  -- Return user profiles with emails
  RETURN QUERY
  SELECT 
    up.id,
    up.user_id,
    up.first_name,
    up.last_name,
    up.role,
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

-- Function to get single user profile with email (for admins or own profile)
CREATE OR REPLACE FUNCTION get_user_profile_with_email(target_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  role TEXT,
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

  -- Return user profile with email
  RETURN QUERY
  SELECT 
    up.id,
    up.user_id,
    up.first_name,
    up.last_name,
    up.role,
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

-- Insert default admin user profile (you'll need to update this with actual admin user ID)
-- This is just a placeholder - you should update it with the actual admin user ID after creating the admin account
-- INSERT INTO user_profiles (user_id, first_name, last_name, user_type, status, is_first_login)
-- VALUES ('your-admin-user-id-here', 'Admin', 'User', 'admin', 'active', false);