-- =============================================================================
-- Territory app – initial schema (run once on a new Supabase project).
-- For future changes, add new migration files and run only those.
-- =============================================================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================
-- PROFILES TABLE
-- ============================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  city TEXT,
  bio TEXT,
  total_distance DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_runs INTEGER NOT NULL DEFAULT 0,
  territories_owned INTEGER NOT NULL DEFAULT 0,
  territories_defended INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'runner_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', 'Runner')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================
-- RUNS TABLE
-- ============================
CREATE TABLE public.runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  distance DOUBLE PRECISION NOT NULL DEFAULT 0,
  duration INTEGER NOT NULL DEFAULT 0,
  avg_pace DOUBLE PRECISION,
  gps_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  route_polyline JSONB,
  is_valid BOOLEAN NOT NULL DEFAULT true,
  territory_claimed BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  name TEXT,
  description TEXT,
  photo_urls JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all runs for map"
  ON public.runs FOR SELECT USING (true);

CREATE POLICY "Users can insert their own runs"
  ON public.runs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own runs"
  ON public.runs FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_runs_user_id ON public.runs(user_id);
CREATE INDEX idx_runs_started_at ON public.runs(started_at DESC);

COMMENT ON COLUMN public.runs.name IS 'User-defined activity name e.g. Evening run';
COMMENT ON COLUMN public.runs.description IS 'Optional run notes';
COMMENT ON COLUMN public.runs.photo_urls IS 'Array of Supabase Storage paths for run photos';

-- ============================
-- TERRITORIES TABLE
-- ============================
CREATE TABLE public.territories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT,
  polygon JSONB NOT NULL,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  area_sqm DOUBLE PRECISION NOT NULL DEFAULT 0,
  strength INTEGER NOT NULL DEFAULT 100,
  last_defended_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_from_run_id UUID REFERENCES public.runs(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.territories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Territories are viewable by everyone"
  ON public.territories FOR SELECT USING (true);

CREATE POLICY "Users can create territories"
  ON public.territories FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own territories"
  ON public.territories FOR UPDATE USING (auth.uid() = owner_id);

CREATE TRIGGER update_territories_updated_at
  BEFORE UPDATE ON public.territories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_territories_owner ON public.territories(owner_id);
CREATE INDEX idx_territories_center ON public.territories(center_lat, center_lng);

-- ============================
-- TERRITORY HISTORY TABLE
-- ============================
CREATE TABLE public.territory_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  territory_id UUID NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  previous_owner_id UUID,
  new_owner_id UUID NOT NULL,
  action TEXT NOT NULL,
  run_id UUID REFERENCES public.runs(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.territory_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Territory history is viewable by everyone"
  ON public.territory_history FOR SELECT USING (true);

CREATE POLICY "System can insert territory history"
  ON public.territory_history FOR INSERT WITH CHECK (auth.uid() = new_owner_id OR auth.uid() = previous_owner_id);

CREATE INDEX idx_territory_history_territory ON public.territory_history(territory_id);

-- ============================
-- ACTIVITY FEED TABLE
-- ============================
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_user_id UUID,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  territory_id UUID REFERENCES public.territories(id) ON DELETE SET NULL,
  run_id UUID REFERENCES public.runs(id) ON DELETE SET NULL,
  is_urgent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activities"
  ON public.activities FOR SELECT USING (auth.uid() = user_id OR auth.uid() = target_user_id);

CREATE POLICY "Users can insert activities"
  ON public.activities FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_activities_user ON public.activities(user_id, created_at DESC);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.territories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;

-- ============================
-- STORAGE: run photos bucket
-- ============================
INSERT INTO storage.buckets (id, name, public)
VALUES ('run-photos', 'run-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can read own run photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'run-photos' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Users can upload own run photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'run-photos' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Users can update own run photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'run-photos' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Users can delete own run photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'run-photos' AND (storage.foldername(name))[1] = (auth.uid())::text);
