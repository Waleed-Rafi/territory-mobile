-- Add status to profiles: active (default) or inactive.
-- Deactivated accounts keep all data; signing in again reactivates the same account.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Ensure only allowed values (optional; helps if you add more statuses later)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('active', 'inactive'));

COMMENT ON COLUMN public.profiles.status IS 'active = normal; inactive = user deactivated account. Data kept; sign-in again reactivates.';
