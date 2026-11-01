CREATE TABLE IF NOT EXISTS public.video_likes (
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (video_id, user_id)
);

CREATE INDEX IF NOT EXISTS video_likes_user_id_idx
  ON public.video_likes (user_id);

ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.video_likes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.video_likes TO authenticated;

CREATE POLICY video_likes_select_own
  ON public.video_likes FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY video_likes_insert_own
  ON public.video_likes FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.videos
      WHERE videos.id = video_likes.video_id
        AND videos.video_type = 'standard'
    )
  );

CREATE POLICY video_likes_delete_own
  ON public.video_likes FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.get_video_like_count(target_video_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT count(*)::bigint
  FROM public.video_likes AS likes
  JOIN public.videos AS videos ON videos.id = likes.video_id
  WHERE videos.id = target_video_id
    AND videos.video_type = 'standard';
$$;

ALTER FUNCTION public.get_video_like_count(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_video_like_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_video_like_count(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_own_video_like_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    (SELECT count(*)::bigint
     FROM public.video_likes AS likes
     JOIN public.videos AS videos ON videos.id = likes.video_id
     WHERE videos.owner_id = auth.uid())
    +
    (SELECT count(*)::bigint
     FROM public.short_video_likes AS likes
     JOIN public.videos AS videos ON videos.id = likes.video_id
     WHERE videos.owner_id = auth.uid());
$$;

ALTER FUNCTION public.get_own_video_like_count() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_own_video_like_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_own_video_like_count() TO authenticated;
