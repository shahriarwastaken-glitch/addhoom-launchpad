
-- Credit costs configuration
CREATE TABLE credit_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key text UNIQUE NOT NULL,
  action_label text NOT NULL,
  credits integer NOT NULL,
  category text NOT NULL,
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

-- Credit transactions ledger
CREATE TABLE credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  workspace_id uuid REFERENCES workspaces(id),
  action_key text,
  credits_delta integer NOT NULL,
  balance_after integer NOT NULL,
  description text,
  transaction_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Add credit balance and monthly_credits columns
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS credit_balance integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS credits_reset_at timestamptz;

ALTER TABLE plans
ADD COLUMN IF NOT EXISTS monthly_credits integer NOT NULL DEFAULT 5000;

-- RLS
ALTER TABLE credit_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_costs_public_read" ON credit_costs FOR SELECT USING (true);

CREATE POLICY "credit_costs_admin_write" ON credit_costs FOR ALL USING (
  is_admin(auth.uid())
) WITH CHECK (
  is_admin(auth.uid())
);

CREATE POLICY "transactions_own_read" ON credit_transactions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "transactions_admin_read" ON credit_transactions FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "transactions_system_insert" ON credit_transactions FOR INSERT
WITH CHECK (true);

-- Atomic deduct function
CREATE OR REPLACE FUNCTION deduct_credits_atomic(
  p_user_id uuid,
  p_workspace_id uuid,
  p_action_key text,
  p_action_label text,
  p_credits integer
) RETURNS jsonb AS $$
DECLARE
  v_balance integer;
  v_new_balance integer;
BEGIN
  SELECT credit_balance INTO v_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_balance < p_credits THEN
    RETURN jsonb_build_object(
      'success', false,
      'balance', v_balance,
      'required', p_credits,
      'error', 'insufficient_credits'
    );
  END IF;

  v_new_balance := v_balance - p_credits;

  UPDATE profiles
  SET credit_balance = v_new_balance
  WHERE id = p_user_id;

  INSERT INTO credit_transactions (
    user_id, workspace_id, action_key,
    credits_delta, balance_after, description, transaction_type
  ) VALUES (
    p_user_id, p_workspace_id, p_action_key,
    -p_credits, v_new_balance, p_action_label, 'action'
  );

  RETURN jsonb_build_object(
    'success', true,
    'credits_used', p_credits,
    'balance_after', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Admin adjust credits function
CREATE OR REPLACE FUNCTION admin_adjust_credits(
  p_admin_id uuid,
  p_user_id uuid,
  p_credits_delta integer,
  p_description text
) RETURNS jsonb AS $$
DECLARE
  v_balance integer;
  v_new_balance integer;
BEGIN
  IF NOT is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT credit_balance INTO v_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  v_new_balance := GREATEST(0, v_balance + p_credits_delta);

  UPDATE profiles
  SET credit_balance = v_new_balance
  WHERE id = p_user_id;

  INSERT INTO credit_transactions (
    user_id, credits_delta, balance_after,
    description, transaction_type, created_by
  ) VALUES (
    p_user_id, p_credits_delta, v_new_balance,
    p_description, 'admin_adjustment', p_admin_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'balance_before', v_balance,
    'balance_after', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Monthly reset function
CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS void AS $$
DECLARE
  v_user RECORD;
BEGIN
  FOR v_user IN
    SELECT
      p.id,
      p.credit_balance,
      pl.monthly_credits
    FROM profiles p
    JOIN plans pl ON pl.plan_key = p.plan_key
    WHERE p.subscription_status = 'active'
      AND pl.monthly_credits > 0
  LOOP
    UPDATE profiles
    SET
      credit_balance = v_user.monthly_credits,
      credits_reset_at = now()
    WHERE id = v_user.id;

    INSERT INTO credit_transactions (
      user_id, credits_delta, balance_after,
      description, transaction_type
    ) VALUES (
      v_user.id,
      v_user.monthly_credits - v_user.credit_balance,
      v_user.monthly_credits,
      'Monthly credit reset',
      'monthly_reset'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
