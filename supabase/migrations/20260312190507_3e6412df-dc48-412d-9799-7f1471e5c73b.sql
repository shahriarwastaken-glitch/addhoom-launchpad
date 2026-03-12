CREATE OR REPLACE FUNCTION public.admin_adjust_credits(p_admin_id uuid, p_user_id uuid, p_credits_delta integer, p_description text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance integer;
  v_new_balance integer;
  v_caller_id uuid;
BEGIN
  -- Use auth.uid() instead of trusting caller-supplied p_admin_id
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: not authenticated';
  END IF;

  IF NOT is_admin(v_caller_id) THEN
    RAISE EXCEPTION 'Unauthorized: not an admin';
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
    p_description, 'admin_adjustment', v_caller_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'balance_before', v_balance,
    'balance_after', v_new_balance
  );
END;
$function$;