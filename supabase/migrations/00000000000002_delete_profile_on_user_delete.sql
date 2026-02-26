-- When a user is deleted from auth.users (e.g. from Supabase Dashboard), delete their profile
-- so the username is freed and they can sign up again with the same username without duplicate key error.

-- Allow trigger to delete profile (runs as postgres / auth admin when user is deleted from Dashboard)
DROP POLICY IF EXISTS "Allow signup trigger to delete profile on user delete" ON public.profiles;
CREATE POLICY "Allow signup trigger to delete profile on user delete"
  ON public.profiles FOR DELETE TO postgres USING (true);

DROP POLICY IF EXISTS "Allow auth admin to delete profile on user delete" ON public.profiles;
CREATE POLICY "Allow auth admin to delete profile on user delete"
  ON public.profiles FOR DELETE TO supabase_auth_admin USING (true);

CREATE OR REPLACE FUNCTION public.handle_user_deleted()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.profiles WHERE user_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_deleted();
