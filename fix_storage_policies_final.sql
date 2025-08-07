-- Final fix for storage policies to resolve RLS violations
-- This script ensures proper storage policies for user file uploads

-- First, ensure the bucket exists and is configured correctly
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-files',
  'user-files',
  false, -- Set to false for proper RLS control
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can view all user files" ON storage.objects;

-- Create new storage policies that work with user ID folder structure
-- Policy for uploading files (users can upload to their own folder)
CREATE POLICY "Users can upload their own files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy for viewing files (users can view their own files)
CREATE POLICY "Users can view their own files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'user-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy for updating files (users can update their own files)
CREATE POLICY "Users can update their own files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'user-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy for deleting files (users can delete their own files)
CREATE POLICY "Users can delete their own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy for admins to view all files (using user_type only)
CREATE POLICY "Admins can view all user files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'user-files' AND 
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() AND up.user_type = 'admin'
    )
  );

-- Note: This policy uses 'user_type' from user_profiles table consistently
-- The 'role' column should be deprecated in favor of 'user_type' for consistency

-- Verify the policies were created
SELECT 
  'Storage policies created:' as info,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;

-- Verify bucket configuration
SELECT 
  'Bucket configuration:' as info,
  id, 
  name, 
  public, 
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'user-files';