CREATE OR REPLACE FUNCTION public.get_video_like_count(target_video_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT count(*)::bigint
  FROM public.video_likes AS likes
  JOIN public.videos AS v ON v.id = likes.video_id
  WHERE v.id = target_video_id
    AND v.video_type = 'standard'
    AND (v.visibility = 'public' OR v.owner_id = (SELECT auth.uid()))
    AND (
      NOT v.privacy_transition_pending
      OR v.owner_id = (SELECT auth.uid())
    );
$$;

ALTER FUNCTION public.get_video_like_count(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_video_like_count(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_video_like_count(uuid) TO anon, authenticated;

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
  WHERE v.id = target_video_id
    AND v.video_type = 'short'
    AND (v.visibility = 'public' OR v.owner_id = (SELECT auth.uid()))
    AND (
      NOT v.privacy_transition_pending
      OR v.owner_id = (SELECT auth.uid())
    )
  GROUP BY l.video_id;
$$;

ALTER FUNCTION public.get_short_video_like_counts(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_short_video_like_counts(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_short_video_like_counts(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_video_view(target_video_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_viewer uuid := auth.uid();
  video_visibility text;
  video_owner_id uuid;
  transition_pending boolean;
  new_count integer;
BEGIN
  SELECT v.visibility, v.owner_id, v.privacy_transition_pending
  INTO video_visibility, video_owner_id, transition_pending
  FROM public.videos AS v
  WHERE v.id = target_video_id
  FOR UPDATE;

  IF NOT FOUND
     OR (video_visibility <> 'public' AND video_owner_id IS DISTINCT FROM current_viewer)
     OR (transition_pending AND video_owner_id IS DISTINCT FROM current_viewer) THEN
    RAISE EXCEPTION 'Video not found' USING ERRCODE = 'P0002';
  END IF;

  IF current_viewer IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.video_views AS views
    WHERE views.video_id = target_video_id
      AND views.viewer_id = current_viewer
      AND views.viewed_at > now() - interval '30 minutes'
  ) THEN
    SELECT v.view_count INTO new_count
    FROM public.videos AS v
    WHERE v.id = target_video_id;
    RETURN new_count;
  END IF;

  INSERT INTO public.video_views (video_id, viewer_id)
  VALUES (target_video_id, current_viewer);

  UPDATE public.videos
  SET view_count = view_count + 1
  WHERE id = target_video_id
  RETURNING view_count INTO new_count;

  RETURN new_count;
END;
$$;

ALTER FUNCTION public.record_video_view(uuid) OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.record_video_view(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_video_view(uuid) TO anon, authenticated;
