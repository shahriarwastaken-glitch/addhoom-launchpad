
CREATE OR REPLACE FUNCTION public.deduct_credits_atomic(p_user_id uuid, p_workspace_id uuid, p_action_key text, p_action_label text, p_credits integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance integer;
  v_new_balance integer;
BEGIN
  -- Security: ensure caller can only deduct their own credits
  IF p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: caller does not match p_user_id';
  END IF;

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
$function$;
