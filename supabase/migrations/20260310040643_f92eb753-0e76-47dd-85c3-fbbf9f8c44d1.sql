
ALTER TABLE public.ad_images 
  ADD COLUMN IF NOT EXISTS text_config jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cutout_url text,
  ADD COLUMN IF NOT EXISTS remixed_from_id uuid REFERENCES public.ad_images(id),
  ADD COLUMN IF NOT EXISTS remix_type text,
  ADD COLUMN IF NOT EXISTS remix_config jsonb DEFAULT '{}';
