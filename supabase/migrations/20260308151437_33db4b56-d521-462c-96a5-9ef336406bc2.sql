
CREATE TABLE public.ad_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  creative_id uuid REFERENCES public.ad_creatives(id) ON DELETE SET NULL,
  product_name text,
  format text NOT NULL DEFAULT 'square',
  style text NOT NULL DEFAULT 'clean',
  image_url text,
  sd_prompt text,
  gemini_prompt text,
  dhoom_score integer DEFAULT 0,
  is_winner boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own ad_images"
  ON public.ad_images
  FOR ALL
  TO authenticated
  USING (auth.uid() = public.workspace_owner_id(workspace_id))
  WITH CHECK (auth.uid() = public.workspace_owner_id(workspace_id));
