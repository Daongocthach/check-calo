-- Drop existing specific policies
DROP POLICY IF EXISTS storage_select_food_entry_images_own ON storage.objects;
DROP POLICY IF EXISTS storage_insert_food_entry_images_own ON storage.objects;
DROP POLICY IF EXISTS storage_update_food_entry_images_own ON storage.objects;
DROP POLICY IF EXISTS storage_delete_food_entry_images_own ON storage.objects;

-- Create more general policies for food-entry-images bucket
CREATE POLICY "Allow users to select their own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'food-entry-images' AND
  (storage.foldername(name))[1] = 'users' AND
  (storage.foldername(name))[2] = (auth.uid())::text
);

CREATE POLICY "Allow users to insert their own files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'food-entry-images' AND
  (storage.foldername(name))[1] = 'users' AND
  (storage.foldername(name))[2] = (auth.uid())::text
);

CREATE POLICY "Allow users to update their own files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'food-entry-images' AND
  (storage.foldername(name))[1] = 'users' AND
  (storage.foldername(name))[2] = (auth.uid())::text
)
WITH CHECK (
  bucket_id = 'food-entry-images' AND
  (storage.foldername(name))[1] = 'users' AND
  (storage.foldername(name))[2] = (auth.uid())::text
);

CREATE POLICY "Allow users to delete their own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'food-entry-images' AND
  (storage.foldername(name))[1] = 'users' AND
  (storage.foldername(name))[2] = (auth.uid())::text
);
