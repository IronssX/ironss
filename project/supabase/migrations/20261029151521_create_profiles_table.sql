/*
# Create profiles table for user accounts

1. New Tables
- `profiles`: one row per signed-in account.
  - `id` (uuid, primary key, references auth.users)
  - `username` (text, 3-20 letters, numbers or underscores, unique ignoring case)
  - `avatar_path` (text, optional path of the profile photo in the avatars bucket)
  - `created_at` and `updated_at` timestamps

2. Automation
- A trigger creates a profile automatically when a new account signs up, using the username entered on the sign-up form.
- A helper function tells the sign-up form whether a username is still free.

3. Security
- Row level security is enabled on `profiles`.
- Signed-in users can read only their own profile.
- Signed-in users can update only their own profile photo path. Username cannot be changed from the app.
- No client can insert or delete profile rows directly; the sign-up trigger creates them.
- The username helper is callable by anonymous visitors and returns only true or false.

4. Important notes
- Passwords are never stored here; they are managed by Supabase Auth.
*/

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL CHECK (username ~ '^[A-Za-z0-9_]{3,20}$'),
  avatar_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key ON public.profiles (lower(username));

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.profiles FROM PUBLIC, anon;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (avatar_path, updated_at) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.is_username_available(candidate text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE lower(username) = lower(candidate)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_username_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated;
