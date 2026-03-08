-- Drop existing api_keys table and recreate with new structure
DROP TABLE IF EXISTS api_keys CASCADE;

-- Create comprehensive api_keys table
CREATE TABLE public.api_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name text NOT NULL,
  display_name text NOT NULL,
  key_value text NOT NULL,
  key_preview text,
  environment text DEFAULT 'production',
  status text DEFAULT 'active',
  last_tested_at timestamptz,
  last_test_result text,
  last_test_error text,
  expires_at timestamptz,
  monthly_limit integer,
  monthly_usage integer DEFAULT 0,
  notes text,
  description text,
  docs_url text,
  icon text,
  is_critical boolean DEFAULT false,
  created_by uuid REFERENCES public.admin_users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  rotated_at timestamptz,
  UNIQUE(service_name, environment)
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Only admins can access api_keys
CREATE POLICY "Only admins can manage api_keys" ON public.api_keys
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Create api_key_logs table for audit trail
CREATE TABLE public.api_key_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  action text NOT NULL,
  performed_by uuid REFERENCES public.admin_users(id),
  result text,
  notes text,
  old_preview text,
  new_preview text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_key_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can access api_key_logs
CREATE POLICY "Only admins can access key logs" ON public.api_key_logs
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Create api_usage_stats table for daily tracking
CREATE TABLE public.api_usage_stats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name text NOT NULL,
  stat_date date NOT NULL,
  calls_made integer DEFAULT 0,
  calls_failed integer DEFAULT 0,
  avg_response_ms integer,
  total_tokens_used integer DEFAULT 0,
  estimated_cost_bdt numeric DEFAULT 0,
  UNIQUE(service_name, stat_date)
);

-- Enable RLS
ALTER TABLE public.api_usage_stats ENABLE ROW LEVEL SECURITY;

-- Only admins can access api_usage_stats
CREATE POLICY "Only admins can access usage stats" ON public.api_usage_stats
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Create function to update updated_at on api_keys
CREATE OR REPLACE FUNCTION public.update_api_keys_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_api_keys_updated_at();