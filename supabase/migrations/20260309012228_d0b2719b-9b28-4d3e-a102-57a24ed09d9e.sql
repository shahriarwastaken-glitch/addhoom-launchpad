-- Create feature_flags table (if not exists)
CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  global_enabled boolean DEFAULT true,
  plan_overrides jsonb DEFAULT '{}',
  user_overrides jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES admin_users(id)
);

-- Enable RLS on feature_flags if not already enabled
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'feature_flags' AND policyname = 'Only admins can manage feature_flags'
    ) THEN
        ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Only admins can manage feature_flags" ON feature_flags
        FOR ALL USING (is_admin(auth.uid())) 
        WITH CHECK (is_admin(auth.uid()));
    END IF;
END $$;

-- Create email_templates table (if not exists)
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key text UNIQUE NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  html_content text NOT NULL,
  variables jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  last_tested_at timestamptz,
  updated_by uuid REFERENCES admin_users(id),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on email_templates if not already enabled
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'email_templates' AND policyname = 'Only admins can manage email_templates'
    ) THEN
        ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Only admins can manage email_templates" ON email_templates
        FOR ALL USING (is_admin(auth.uid())) 
        WITH CHECK (is_admin(auth.uid()));
    END IF;
END $$;

-- Seed feature flags
INSERT INTO feature_flags (flag_key, name, description, global_enabled) VALUES
('video_generation', 'Video Generation', 'Enable/disable video ad generation', true),
('image_generation', 'Image Generation', 'Enable/disable image generation', true),
('ai_chat', 'AI Chat', 'Enable/disable AI chat functionality', true),
('competitor_analysis', 'Competitor Analysis', 'Enable/disable competitor analysis', true),
('account_doctor', 'Account Doctor', 'Enable/disable account doctor feature', true),
('analytics', 'Analytics', 'Enable/disable analytics dashboard', true),
('user_impersonation', 'User Impersonation', 'Allow admins to impersonate users', false),
('new_onboarding_flow', 'New Onboarding Flow', 'A/B test new onboarding', false)
ON CONFLICT (flag_key) DO NOTHING;

-- Seed additional app_settings
INSERT INTO app_settings (setting_key, setting_value, setting_type, description) VALUES
('maintenance_mode', 'false', 'boolean', 'Maintenance mode toggle'),
('maintenance_message', 'System update in progress', 'text', 'Maintenance message'),
('maintenance_eta', '30 minutes', 'text', 'Estimated time')
ON CONFLICT (setting_key) DO NOTHING;