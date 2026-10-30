/*
# Add channel description and public channel profiles

1. Modified tables
- `profiles`: new column `channel_description` (optional text, up to 500 characters). Users write it on their own profile page and it appears on their channel page.

2. Security changes
- Anyone (signed in or not) can read profile rows so channel pages can show a username, avatar and description. Email addresses are stored in the authentication table and are never exposed here.
- Signed-in users can update only `channel_description` on their own row. The existing rule that limits updates to the owner still applies.
*/

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS channel_description text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_channel_description_length'
      AND conrelid = 'public.profiles'::regclass
  ) THENA
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_channel_description_length
      CHECK (channel_description IS NULL OR char_length(channel_description) <= 500);
  END IF;
END $$;

GRANT SELECT ON public.profiles TO anon;
GRANT UPDATE (channel_description) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "select_public_channel_profiles" ON public.profiles;
CREATE POLICY "select_public_channel_profiles" ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);
