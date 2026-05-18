-- Migration: Setup Storage RLS for food-entry-images
-- Created at: 2026-05-07

-- 1. Ensure the bucket exists (this part is usually done in the dashboard, but we can try to do it via SQL if the extension is enabled)
-- Note: Supabase SQL Editor might not allow direct insertion into storage.buckets depending on permissions,
-- but the RLS policies below are what's strictly needed for the error reported.

INSERT INTO storage.buckets (id, name, public)
VALUES ('food-entry-images', 'food-entry-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage.objects (it's enabled by default, but let's be sure)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Create policies for the 'food-entry-images' bucket

-- Allow users to upload their own images
CREATE POLICY "Allow users to upload their own food images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'food-entry-images' AND
  (storage.foldername(name))[1] = 'users' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow users to update their own images
CREATE POLICY "Allow users to update their own food images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'food-entry-images' AND
  (storage.foldername(name))[1] = 'users' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow users to delete their own images
CREATE POLICY "Allow users to delete their own food images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'food-entry-images' AND
  (storage.foldername(name))[1] = 'users' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow everyone to read images (since the bucket is public)
-- or restricted to authenticated if preferred. Here we allow everyone for simplicity if public=true.
CREATE POLICY "Allow everyone to read food images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'food-entry-images');
