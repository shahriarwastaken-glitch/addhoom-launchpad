
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tour_completed boolean DEFAULT false;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS primary_platform text;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS default_language text DEFAULT 'en';
