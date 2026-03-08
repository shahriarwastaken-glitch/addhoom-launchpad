-- Helper function for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1. profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  language_pref TEXT NOT NULL DEFAULT 'bn',
  plan TEXT NOT NULL DEFAULT 'pro',
  subscription_status TEXT NOT NULL DEFAULT 'inactive',
  subscription_expires_at TIMESTAMPTZ,
  ssl_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. workspaces
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shop_name TEXT NOT NULL,
  shop_url TEXT,
  platform TEXT,
  industry TEXT,
  language TEXT NOT NULL DEFAULT 'bn',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own workspaces" ON public.workspaces FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can create own workspaces" ON public.workspaces FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own workspaces" ON public.workspaces FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own workspaces" ON public.workspaces FOR DELETE USING (auth.uid() = owner_id);

-- Security definer to check workspace ownership (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.workspace_owner_id(_workspace_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT owner_id FROM public.workspaces WHERE id = _workspace_id $$;

-- 3. campaigns
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL, platform TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  budget_bdt NUMERIC, start_date DATE, end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own campaigns" ON public.campaigns FOR ALL USING (auth.uid() = public.workspace_owner_id(workspace_id));

-- 4. ad_creatives
CREATE TABLE public.ad_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  headline TEXT, body TEXT, cta TEXT,
  language TEXT, platform TEXT, framework TEXT, occasion TEXT,
  dhoom_score INTEGER, copy_score INTEGER, score_reason TEXT,
  is_winner BOOLEAN NOT NULL DEFAULT false,
  ai_generated BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ad_creatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own ad_creatives" ON public.ad_creatives FOR ALL USING (auth.uid() = public.workspace_owner_id(workspace_id));

-- 5. ai_conversations
CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT, messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  language TEXT NOT NULL DEFAULT 'bn',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own conversations" ON public.ai_conversations FOR ALL USING (auth.uid() = public.workspace_owner_id(workspace_id));
CREATE TRIGGER update_ai_conversations_updated_at BEFORE UPDATE ON public.ai_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. competitor_analyses
CREATE TABLE public.competitor_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  competitor_name TEXT, competitor_url TEXT,
  ads_found JSONB, ai_analysis TEXT, counter_strategy TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.competitor_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own competitor_analyses" ON public.competitor_analyses FOR ALL USING (auth.uid() = public.workspace_owner_id(workspace_id));

-- 7. account_health_reports
CREATE TABLE public.account_health_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  health_score INTEGER, good_items JSONB, warning_items JSONB, critical_items JSONB,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.account_health_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own health_reports" ON public.account_health_reports FOR ALL USING (auth.uid() = public.workspace_owner_id(workspace_id));

-- 8. payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_bdt NUMERIC NOT NULL, method TEXT, ssl_session_id TEXT, transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', plan_purchased TEXT, billing_cycle TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 9. usage_logs
CREATE TABLE public.usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id UUID, feature TEXT NOT NULL, tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own usage_logs" ON public.usage_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own usage_logs" ON public.usage_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_workspaces_owner ON public.workspaces(owner_id);
CREATE INDEX idx_campaigns_workspace ON public.campaigns(workspace_id);
CREATE INDEX idx_ad_creatives_workspace ON public.ad_creatives(workspace_id);
CREATE INDEX idx_ai_conversations_workspace ON public.ai_conversations(workspace_id);
CREATE INDEX idx_usage_logs_user_feature ON public.usage_logs(user_id, feature, created_at);
CREATE INDEX idx_payments_user ON public.payments(user_id);