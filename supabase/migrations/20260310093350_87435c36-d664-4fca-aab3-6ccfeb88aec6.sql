ALTER TABLE video_ads ADD COLUMN IF NOT EXISTS video_type text DEFAULT 'slideshow';
ALTER TABLE video_ads ADD COLUMN IF NOT EXISTS motion_style text;
ALTER TABLE video_ads ADD COLUMN IF NOT EXISTS motion_prompt text;
ALTER TABLE video_ads ADD COLUMN IF NOT EXISTS input_mode text;
ALTER TABLE video_ads ADD COLUMN IF NOT EXISTS source_images text[] DEFAULT '{}';
ALTER TABLE video_ads ADD COLUMN IF NOT EXISTS duration_seconds integer DEFAULT 15;