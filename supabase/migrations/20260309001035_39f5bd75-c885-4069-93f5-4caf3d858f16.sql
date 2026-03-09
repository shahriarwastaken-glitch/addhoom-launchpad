-- Add performance rating columns to ad_creatives table
ALTER TABLE ad_creatives 
  ADD COLUMN IF NOT EXISTS performance_rating text 
    CHECK (performance_rating IN ('good', 'neutral', 'poor')),
  ADD COLUMN IF NOT EXISTS rated_at timestamptz;