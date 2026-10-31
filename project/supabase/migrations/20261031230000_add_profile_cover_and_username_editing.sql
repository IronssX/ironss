ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cover_image_path text,
  ADD COLUMN IF NOT EXISTS cover_theme text NOT NULL DEFAULT 'purple-neon';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_cover_theme_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_cover_theme_check
      CHECK (cover_theme IN ('purple-neon', 'black', 'minimal', 'gaming'));
  END IF;
END;
$$;

GRANT UPDATE (username, cover_image_path, cover_theme, updated_at)
  ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.is_profile_username_available(candidate text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND btrim(candidate) ~ '^[A-Za-z0-9_]{3,20}$'
    AND NOT EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE lower(p.username) = lower(btrim(candidate))
        AND p.id <> auth.uid()
    );
$$;

REVOKE EXECUTE ON FUNCTION public.is_profile_username_available(text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_profile_username_available(text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_profile_video_uploader_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.videos
  SET uploader_name = NEW.username
  WHERE owner_id = NEW.id;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_profile_video_uploader_name()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_profile_video_uploader_name_trigger ON public.profiles;
CREATE TRIGGER sync_profile_video_uploader_name_trigger
  AFTER UPDATE OF username ON public.profiles
  FOR EACH ROW
  WHEN (OLD.username IS DISTINCT FROM NEW.username)
  EXECUTE FUNCTION public.sync_profile_video_uploader_name();
