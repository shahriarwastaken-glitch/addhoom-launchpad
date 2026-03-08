-- Admin verification codes table for critical actions
CREATE TABLE public.admin_verification_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid REFERENCES public.admin_users(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL,
  action_type text NOT NULL,
  action_payload jsonb,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can access verification codes"
ON public.admin_verification_codes
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Index for quick lookups
CREATE INDEX idx_admin_verification_codes_admin_id ON public.admin_verification_codes(admin_id);
CREATE INDEX idx_admin_verification_codes_expires ON public.admin_verification_codes(expires_at);