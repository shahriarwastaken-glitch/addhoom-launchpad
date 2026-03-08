
-- Create video_ads table
CREATE TABLE public.video_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_name TEXT,
  render_id TEXT,
  status TEXT NOT NULL DEFAULT 'processing',
  video_url TEXT,
  script JSONB,
  format TEXT NOT NULL DEFAULT 'reels',
  style TEXT NOT NULL DEFAULT 'clean',
  music_track TEXT NOT NULL DEFAULT 'soft',
  font_style TEXT DEFAULT 'hind',
  voiceover_enabled BOOLEAN DEFAULT false,
  dhoom_score INTEGER DEFAULT 0,
  file_size_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.video_ads ENABLE ROW LEVEL SECURITY;

-- RLS policy using workspace_owner_id
CREATE POLICY "Users can manage own video_ads"
ON public.video_ads
FOR ALL
TO authenticated
USING (auth.uid() = workspace_owner_id(workspace_id))
WITH CHECK (auth.uid() = workspace_owner_id(workspace_id));

-- Create video-assets storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('video-assets', 'video-assets', true);

-- Storage RLS policies
CREATE POLICY "Users can upload video assets" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'video-assets');

CREATE POLICY "Public read for video assets" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'video-assets');

CREATE POLICY "Users can delete own video assets" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'video-assets');
