-- Add elevation_gain (meters) to runs for elevation tracking
ALTER TABLE public.runs
  ADD COLUMN IF NOT EXISTS elevation_gain DOUBLE PRECISION;

COMMENT ON COLUMN public.runs.elevation_gain IS 'Total elevation gain in meters (from GPS altitude).';
