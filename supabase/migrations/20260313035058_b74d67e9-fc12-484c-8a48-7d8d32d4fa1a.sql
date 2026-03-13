
-- Create a trigger that prevents non-service-role users from modifying sensitive profile fields
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow service role (triggers, edge functions) to update anything
  -- When called via service role, auth.uid() is NULL
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Allow admins to update anything
  IF is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- For regular users, revert sensitive fields to their original values
  NEW.plan := OLD.plan;
  NEW.plan_key := OLD.plan_key;
  NEW.subscription_status := OLD.subscription_status;
  NEW.subscription_expires_at := OLD.subscription_expires_at;
  NEW.credit_balance := OLD.credit_balance;
  NEW.credits_reset_at := OLD.credits_reset_at;
  NEW.ssl_customer_id := OLD.ssl_customer_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_sensitive_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_sensitive_profile_fields();

-- Also protect INSERT: ensure new profiles start with safe defaults
-- Replace the permissive INSERT policy with one that enforces default values
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO public
  WITH CHECK (
    auth.uid() = id
    AND plan = 'free'
    AND plan_key = 'free'
    AND subscription_status = 'inactive'
    AND credit_balance = 0
  );
