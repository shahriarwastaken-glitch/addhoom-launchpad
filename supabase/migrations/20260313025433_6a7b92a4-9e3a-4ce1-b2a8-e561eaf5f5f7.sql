
-- Drop the overly permissive ALL policy
DROP POLICY IF EXISTS "users_own_subscription" ON public.subscriptions;

-- Users can only SELECT their own subscriptions
CREATE POLICY "users_own_subscription_select"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
