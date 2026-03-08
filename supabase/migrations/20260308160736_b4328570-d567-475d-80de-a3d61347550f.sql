
-- Create storage bucket for ad images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ad-images', 'ad-images', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their workspace folder
CREATE POLICY "Users can upload ad images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ad-images');

-- Allow public read access
CREATE POLICY "Public read access for ad images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ad-images');

-- Allow service role to manage
CREATE POLICY "Service role full access ad images"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'ad-images');
