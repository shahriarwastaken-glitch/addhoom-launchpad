
ALTER TABLE public.ad_creatives 
  ADD COLUMN IF NOT EXISTS tone text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS product_name text;
