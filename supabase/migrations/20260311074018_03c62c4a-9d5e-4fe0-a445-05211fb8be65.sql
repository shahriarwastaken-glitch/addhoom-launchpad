
ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS color text DEFAULT '#FF5100',
ADD COLUMN IF NOT EXISTS icon_name text DEFAULT 'store',
ADD COLUMN IF NOT EXISTS default_tone text DEFAULT 'friendly',
ADD COLUMN IF NOT EXISTS member_count integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS workspaces_default_per_user ON workspaces (owner_id) WHERE is_default = true;

CREATE OR REPLACE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'Users can update own workspaces') THEN
    CREATE POLICY "Users can update own workspaces" ON workspaces FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'Users can delete own workspaces') THEN
    CREATE POLICY "Users can delete own workspaces" ON workspaces FOR DELETE TO authenticated USING (auth.uid() = owner_id);
  END IF;
END $$;
