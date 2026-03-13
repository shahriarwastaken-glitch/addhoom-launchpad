
-- Credit packs table
CREATE TABLE IF NOT EXISTS credit_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  credits integer NOT NULL,
  price_usd numeric NOT NULL,
  price_bdt numeric NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE credit_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_read_active_packs"
ON credit_packs FOR SELECT
USING (is_active = true);

CREATE POLICY "admins_manage_packs"
ON credit_packs FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Credit pack purchases table
CREATE TABLE IF NOT EXISTS credit_pack_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  pack_id uuid REFERENCES credit_packs(id) NOT NULL,
  credits integer NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL,
  status text DEFAULT 'pending',
  tran_id text UNIQUE NOT NULL,
  val_id text,
  bank_tran_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE credit_pack_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_pack_purchases_select"
ON credit_pack_purchases FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "admins_manage_pack_purchases"
ON credit_pack_purchases FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- add_credits function (service role only, SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.add_pack_credits(
  p_user_id uuid,
  p_credits integer,
  p_description text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  UPDATE profiles
  SET credit_balance = credit_balance + p_credits
  WHERE id = p_user_id
  RETURNING credit_balance INTO v_new_balance;

  INSERT INTO credit_transactions (
    user_id, credits_delta, balance_after,
    description, transaction_type
  ) VALUES (
    p_user_id, p_credits, v_new_balance,
    p_description, 'credit_pack_purchase'
  );
END;
$$;

-- Seed credit packs
INSERT INTO credit_packs (name, credits, price_usd, price_bdt, sort_order)
VALUES
  ('Small',  2000,  10, 450,  1),
  ('Medium', 5000,  22, 999,  2),
  ('Large',  12000, 50, 2299, 3);
