
-- Fix the overly permissive INSERT policy
DROP POLICY IF EXISTS "transactions_system_insert" ON credit_transactions;

-- Only allow inserts where user_id matches auth user (service role bypasses RLS anyway)
CREATE POLICY "transactions_user_insert" ON credit_transactions FOR INSERT
WITH CHECK (user_id = auth.uid());
