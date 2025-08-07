-- Create storage bucket for user files
-- This part can be executed with regular permissions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-files',
  'user-files',
  true,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- IMPORTANT: The following RLS policies require superuser privileges
-- If you get "must be owner of table objects" error, create these policies manually in Supabase Dashboard:
-- 
-- 1. Go to Storage > user-files bucket > Policies
-- 2. Create the following policies:
--
-- Policy Name: "Users can upload their own files"
-- Operation: INSERT
-- Target roles: authenticated
-- USING expression: bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]
--
-- Policy Name: "Users can view their own files" 
-- Operation: SELECT
-- Target roles: authenticated
-- USING expression: bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]
--
-- Policy Name: "Coaches can view all user files"
-- Operation: SELECT
-- Target roles: authenticated
-- USING expression: bucket_id = 'user-files' AND EXISTS (
--   SELECT 1 FROM auth.users 
--   WHERE auth.users.id = auth.uid() 
--   AND auth.users.raw_user_meta_data->>'role' = 'coach'
-- )
--
-- Policy Name: "Users can update their own files"
-- Operation: UPDATE  
-- Target roles: authenticated
-- USING expression: bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]
--
-- Policy Name: "Users can delete their own files"
-- Operation: DELETE
-- Target roles: authenticated
-- USING expression: bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]

/*
-- Uncomment these lines only if you have superuser privileges:

CREATE POLICY "Users can upload their own files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'user-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Coaches can view all user files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'user-files' AND 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'coach'
    )
  );

CREATE POLICY "Users can update their own files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'user-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
*/