
-- 1. Rename campaigns table to projects
ALTER TABLE public.campaigns RENAME TO projects;

-- 2. Drop unused columns
ALTER TABLE public.projects DROP COLUMN IF EXISTS budget_bdt;
ALTER TABLE public.projects DROP COLUMN IF EXISTS status;

-- 3. Add new columns
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS color text DEFAULT '#FF5100';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS emoji text DEFAULT '📁';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 4. Rename ad_creatives.campaign_id to project_id
ALTER TABLE public.ad_creatives RENAME COLUMN campaign_id TO project_id;

-- 5. Drop old RLS policy and recreate for projects
DROP POLICY IF EXISTS "Users can manage own campaigns" ON public.projects;
CREATE POLICY "Users can manage own projects"
  ON public.projects
  FOR ALL
  TO authenticated
  USING (auth.uid() = workspace_owner_id(workspace_id))
  WITH CHECK (auth.uid() = workspace_owner_id(workspace_id));

-- 6. Create updated_at trigger for projects
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
