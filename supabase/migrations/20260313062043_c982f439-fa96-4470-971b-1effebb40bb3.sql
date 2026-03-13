
-- 1. Attach the existing protect_sensitive_profile_fields function as a BEFORE UPDATE trigger
CREATE TRIGGER trg_protect_sensitive_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_sensitive_profile_fields();

-- 2. Drop the overly permissive UPDATE policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 3. Re-create with WITH CHECK that blocks direct modification of financial fields
-- Note: In RLS WITH CHECK we cannot reference OLD, so we use the trigger as primary defense.
-- This WITH CHECK ensures the row still belongs to the user after update.
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO public
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
