ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS video_type text NOT NULL DEFAULT 'standard';

ALTER TABLE public.videos
  DROP CONSTRAINT IF EXISTS videos_video_type_check;

ALTER TABLE public.videos
  ADD CONSTRAINT videos_video_type_check
  CHECK (video_type IN ('standard', 'short'));

REVOKE INSERT (video_type) ON public.videos FROM PUBLIC, anon, authenticated;
GRANT INSERT (video_type) ON public.videos TO authenticated;
