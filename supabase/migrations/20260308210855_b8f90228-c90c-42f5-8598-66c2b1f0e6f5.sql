
ALTER TABLE public.content_calendar 
  ADD COLUMN IF NOT EXISTS recommended_framework text,
  ADD COLUMN IF NOT EXISTS recommended_tone text,
  ADD COLUMN IF NOT EXISTS festival_theme text,
  ADD COLUMN IF NOT EXISTS generated_creative_id uuid REFERENCES public.ad_creatives(id),
  ADD COLUMN IF NOT EXISTS swipe_action text,
  ADD COLUMN IF NOT EXISTS swiped_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_content_calendar_workspace_date ON public.content_calendar(workspace_id, date);
CREATE INDEX IF NOT EXISTS idx_content_calendar_workspace_status ON public.content_calendar(workspace_id, status);
