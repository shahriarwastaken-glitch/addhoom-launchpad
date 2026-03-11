
-- pending_transactions table
CREATE TABLE IF NOT EXISTS pending_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  plan_id uuid REFERENCES plans(id),
  plan_key text NOT NULL,
  currency text NOT NULL DEFAULT 'BDT',
  amount numeric NOT NULL,
  tran_id text UNIQUE NOT NULL,
  status text DEFAULT 'pending',
  is_upgrade boolean DEFAULT false,
  previous_plan_key text,
  val_id text,
  bank_tran_id text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '1 hour')
);

ALTER TABLE pending_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_pending_select" ON pending_transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "admins_view_pending" ON pending_transactions
  FOR SELECT USING (is_admin(auth.uid()));

-- Add columns to subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS val_id text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS bank_tran_id text;

-- Add USD pricing to plans
ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_usd numeric;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_annual_usd numeric;
