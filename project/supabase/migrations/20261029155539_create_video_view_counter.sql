/*
# Video view counter

1. Modified tables
- `videos`: new column `view_count` (whole number, starts at 0, never negative). It stores the total number of recorded views for each uploaded video.

2. New tables
- `video_views`: one row per recorded view with the video, the signed-in viewer (empty for guests) and the time of the view. It is used to stop the same signed-in user from being counted again within 30 minutes.

3. Functions
- `record_video_view(target_video_id)`: the only way to change a view count. It checks that the video exists, skips counting if the same signed-in user was already counted for that video in the last 30 minutes, otherwise adds one view and returns the new total.

4. Security
- Row level security is enabled on `video_views` with no client access, so visitors cannot read or edit the log directly.
- Clients have no permission to update `videos.view_count`, so the number can only change through the function above.
- The function is callable by guests and signed-in users; it runs with owner rights only inside this function and sets a fixed search path.
*/

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'videos_view_count_non_negative'
      AND conrelid = 'public.videos'::regclass
  ) THEN
    ALTER TABLE public.videos
      ADD CONSTRAINT videos_view_count_non_negative CHECK (view_count >= 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.video_views (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS video_views_video_viewer_time_idx
  ON public.video_views (video_id, viewer_id, viewed_at DESC);

ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.video_views FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_video_view(target_video_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_viewer uuid := auth.uid();
  new_count integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.videos WHERE id = target_video_id) THEN
    RAISE EXCEPTION 'Video not found' USING ERRCODE = 'P0002';
  END IF;

  IF current_viewer IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.video_views v
    WHERE v.video_id = target_video_id
      AND v.viewer_id = current_viewer
      AND v.viewed_at > now() - interval '30 minutes'
  ) THEN
    SELECT view_count INTO new_count FROM public.videos WHERE id = target_video_id;
    RETURN new_count;
  END IF;

  INSERT INTO public.video_views (video_id, viewer_id) VALUES (target_video_id, current_viewer);

  UPDATE public.videos
  SET view_count = view_count + 1
  WHERE id = target_video_id
  RETURNING view_count INTO new_count;

  RETURN new_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_video_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_video_view(uuid) TO anon, authenticated;
