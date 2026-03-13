
ALTER TABLE public.ad_images ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE public.video_ads ADD COLUMN IF NOT EXISTS storage_path text;
