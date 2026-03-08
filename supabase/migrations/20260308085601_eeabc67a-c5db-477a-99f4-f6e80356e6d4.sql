
ALTER TABLE public.workspaces 
  ADD COLUMN IF NOT EXISTS brand_tone text,
  ADD COLUMN IF NOT EXISTS target_audience text,
  ADD COLUMN IF NOT EXISTS key_products text,
  ADD COLUMN IF NOT EXISTS unique_selling text,
  ADD COLUMN IF NOT EXISTS price_range text;

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;
