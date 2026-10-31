CREATE TABLE public.short_video_likes (
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT short_video_likes_video_user_key UNIQUE (video_id, user_id)
);

CREATE INDEX short_video_likes_video_id_idx ON public.short_video_likes (video_id);

ALTER TABLE public.short_video_likes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.short_video_likes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.short_video_likes TO authenticated;

CREATE POLICY short_video_likes_select_own
  ON public.short_video_likes FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY short_video_likes_insert_own
  ON public.short_video_likes FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.videos
      WHERE videos.id = short_video_likes.video_id
        AND videos.video_type = 'short'
    )
  );

CREATE POLICY short_video_likes_delete_own
  ON public.short_video_likes FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE TABLE public.short_video_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX short_video_comments_video_created_idx
  ON public.short_video_comments (video_id, created_at DESC);

ALTER TABLE public.short_video_comments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.short_video_comments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.short_video_comments TO anon, authenticated;
GRANT INSERT, DELETE ON public.short_video_comments TO authenticated;

CREATE POLICY short_video_comments_select_public
  ON public.short_video_comments FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY short_video_comments_insert_own
  ON public.short_video_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.videos
      WHERE videos.id = short_video_comments.video_id
        AND videos.video_type = 'short'
    )
  );

CREATE POLICY short_video_comments_delete_own
  ON public.short_video_comments FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP VIEW IF EXISTS public.short_video_like_counts;

CREATE OR REPLACE FUNCTION public.get_short_video_like_counts(target_video_id uuid)
RETURNS TABLE (video_id uuid, like_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT l.video_id, count(*)::bigint AS like_count
  FROM public.short_video_likes AS l
  JOIN public.videos AS v ON v.id = l.video_id
  WHERE v.video_type = 'short'
    AND v.id = target_video_id
  GROUP BY l.video_id;
$$;

ALTER FUNCTION public.get_short_video_like_counts(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_short_video_like_counts(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_short_video_like_counts(uuid) TO anon, authenticated;
