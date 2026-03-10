CREATE TABLE IF NOT EXISTS studio_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces NOT NULL,
  user_id uuid NOT NULL,
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  input_config jsonb NOT NULL DEFAULT '{}',
  output_urls text[] DEFAULT '{}',
  error_message text,
  queued_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  total_variations int DEFAULT 1,
  completed_variations int DEFAULT 0,
  attempt_count int DEFAULT 0,
  max_attempts int DEFAULT 3
);

CREATE INDEX idx_studio_jobs_user_status ON studio_jobs(user_id, status, queued_at DESC);

ALTER TABLE studio_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own jobs" ON studio_jobs FOR ALL USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.studio_jobs;