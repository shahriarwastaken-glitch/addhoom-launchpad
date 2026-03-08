-- Admin users table - only existing admins can access
CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text,
  role text DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Only existing admin_users can SELECT
CREATE POLICY "Only admins can view admin_users"
ON public.admin_users
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Platform metrics cache for fast dashboard loading
CREATE TABLE public.platform_metrics_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_date date UNIQUE NOT NULL,
  total_users integer DEFAULT 0,
  new_users_today integer DEFAULT 0,
  active_users_today integer DEFAULT 0,
  pro_users integer DEFAULT 0,
  agency_users integer DEFAULT 0,
  total_ads_generated integer DEFAULT 0,
  ads_generated_today integer DEFAULT 0,
  total_videos_generated integer DEFAULT 0,
  total_revenue_bdt numeric DEFAULT 0,
  revenue_today_bdt numeric DEFAULT 0,
  avg_dhoom_score numeric DEFAULT 0,
  total_ai_calls integer DEFAULT 0,
  computed_at timestamptz DEFAULT now()
);

ALTER TABLE public.platform_metrics_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can access metrics cache"
ON public.platform_metrics_cache
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Admin actions audit log
CREATE TABLE public.admin_actions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid REFERENCES auth.users ON DELETE SET NULL,
  action text NOT NULL,
  target_user_id uuid,
  old_value text,
  new_value text,
  reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view admin actions"
ON public.admin_actions
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can insert admin actions"
ON public.admin_actions
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Function to check if user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE id = _user_id
      AND role = 'super_admin'
  )
$$;