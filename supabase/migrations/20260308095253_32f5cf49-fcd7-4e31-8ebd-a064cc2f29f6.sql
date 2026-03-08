
CREATE TABLE public.content_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  date date NOT NULL,
  day_of_week text,
  content_type text NOT NULL DEFAULT 'product_ad',
  platform text DEFAULT 'facebook',
  title text,
  content_idea text,
  hook text,
  occasion text DEFAULT 'general',
  priority text DEFAULT 'medium',
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  batch_id uuid
);

ALTER TABLE public.content_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own content_calendar"
  ON public.content_calendar
  FOR ALL
  USING (auth.uid() = workspace_owner_id(workspace_id));
