-- Add run name, description, and photo URLs for post-run activity details (Strava-style).
ALTER TABLE public.runs
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS photo_urls JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.runs.name IS 'User-defined activity name e.g. Evening run';
COMMENT ON COLUMN public.runs.description IS 'Optional run notes';
COMMENT ON COLUMN public.runs.photo_urls IS 'Array of Supabase Storage paths for run photos';

-- Storage bucket for run photos (private; access via RLS).
-- If your Supabase project does not allow INSERT into storage.buckets, create the bucket via Dashboard or API.
INSERT INTO storage.buckets (id, name, public)
VALUES ('run-photos', 'run-photos', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: users can read/upload/update/delete only their own files under {user_id}/...
-- Path format: {user_id}/{run_id}/{filename}
CREATE POLICY "Users can read own run photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'run-photos'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "Users can upload own run photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'run-photos'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "Users can update own run photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'run-photos'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "Users can delete own run photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'run-photos'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );
