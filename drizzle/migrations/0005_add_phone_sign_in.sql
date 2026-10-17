-- Phone-code sign-in: one-time codes and the phone -> account mapping.
-- Both tables are written only by trusted server code (service_role); no policies
-- are created on purpose so no browser or anonymous role can read or write them.

CREATE TABLE public.phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX phone_verifications_phone_created_idx ON public.phone_verifications (phone, created_at DESC);
GRANT ALL ON public.phone_verifications TO service_role;
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.phone_accounts (
  phone text PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.phone_accounts TO service_role;
ALTER TABLE public.phone_accounts ENABLE ROW LEVEL SECURITY;