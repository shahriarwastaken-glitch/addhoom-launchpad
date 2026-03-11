CREATE INDEX IF NOT EXISTS idx_ad_images_workspace ON ad_images(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_studio_jobs_user_status ON studio_jobs(user_id, status, queued_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_transactions_tran_id ON pending_transactions(tran_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);