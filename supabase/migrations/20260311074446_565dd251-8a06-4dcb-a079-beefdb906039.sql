
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS default_ad_language text DEFAULT 'en',
ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"credit_reset": true, "low_credits": true, "generation_complete": true, "weekly_summary": false, "product_updates": false, "tips": false}';

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES plans(id) NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  cancelled_at timestamptz,
  sslcommerz_transaction_id text,
  currency text DEFAULT 'USD',
  amount integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subscription_id uuid REFERENCES subscriptions(id),
  plan_name text NOT NULL,
  amount integer NOT NULL,
  currency text NOT NULL,
  status text NOT NULL,
  sslcommerz_transaction_id text,
  invoice_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_subscription" ON subscriptions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "admins_view_subscriptions" ON subscriptions FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "users_own_billing" ON billing_history FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins_view_billing" ON billing_history FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE OR REPLACE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
