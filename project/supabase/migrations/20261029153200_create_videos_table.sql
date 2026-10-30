/*
# Create videos table for user uploads

1. New Tables
- `videos`: one row per uploaded video.
  - `id` (uuid, primary key)
  - `owner_id` (uuid, the uploading account; defaults to the signed-in user)
  - `uploader_name` (text, the uploader's username, filled automatically from their profile)
  - `title` (text, 1-120 characters)
  - `description` (text, up to 2000 characters, may be empty)
  - `video_path` and `thumbnail_path` (text, file locations in the videos storage bucket)
  - `mime_type` (text, video/mp4 or video/webm)
  - `file_size` (bigint, size in bytes)
  - `created_at` (timestamp of upload)

2. Automation
- A trigger fills `uploader_name` from the uploader's profile and refuses rows for accounts without a profile.

3. Security
- Row level security is enabled.
- Anyone (including visitors who are not signed in) can read the video list, because the home page is public.
- Only signed-in users can insert rows, and only with their own user ID as owner.
- No update or delete rights are granted to any client, so nobody can change or remove another user's record through the app.

4. Important notes
- Re-running this migration is safe.
*/

CREATE TABLE IF NOT EXISTS public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  uploader_name text,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  video_path text NOT NULL CHECK (split_part(video_path, '/', 1) = owner_id::text),
  thumbnail_path text CHECK (thumbnail_path IS NULL OR split_part(thumbnail_path, '/', 1) = owner_id::text),
  mime_type text NOT NULL CHECK (mime_type IN ('video/mp4', 'video/webm')),
  file_size bigint NOT NULL CHECK (file_size > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS videos_created_at_idx ON public.videos (created_at DESC);
CREATE INDEX IF NOT EXISTS videos_owner_id_idx ON public.videos (owner_id);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.videos FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.videos TO anon, authenticated;
GRANT INSERT (title, description, video_path, thumbnail_path, mime_type, file_size) ON public.videos TO authenticated;

DROP POLICY IF EXISTS "select_all_videos" ON public.videos;
CREATE POLICY "select_all_videos" ON public.videos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_videos" ON public.videos;
CREATE POLICY "insert_own_videos" ON public.videos FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.set_video_uploader_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.uploader_name := (SELECT p.username FROM public.profiles p WHERE p.id = NEW.owner_id);
  IF NEW.uploader_name IS NULL THEN
    RAISE EXCEPTION 'Uploader profile not found';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_video_uploader_name() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS set_video_uploader_name_trigger ON public.videos;
CREATE TRIGGER set_video_uploader_name_trigger
  BEFORE INSERT ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.set_video_uploader_name();
