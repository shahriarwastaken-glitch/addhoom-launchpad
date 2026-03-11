
CREATE OR REPLACE FUNCTION public.reset_monthly_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
      AND p.credits_reset_at IS NOT NULL
      AND p.credits_reset_at + interval '30 days' <= now()
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
$$
