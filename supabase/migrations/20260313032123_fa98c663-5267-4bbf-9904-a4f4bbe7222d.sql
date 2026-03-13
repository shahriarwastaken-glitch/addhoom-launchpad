
-- Fix ad-images upload policy: scope to user's UUID-prefixed path
DROP POLICY IF EXISTS "Users can upload ad images" ON storage.objects;
CREATE POLICY "Users upload own ad images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ad-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Fix video-assets upload policy: scope to user's UUID-prefixed path
DROP POLICY IF EXISTS "Users can upload video assets" ON storage.objects;
CREATE POLICY "Users upload own video assets" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'video-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Fix video-assets delete policy: scope to user's own files
DROP POLICY IF EXISTS "Users can delete own video assets" ON storage.objects;
CREATE POLICY "Users delete own video assets" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'video-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
