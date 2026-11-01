ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS comments_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.videos
  ALTER COLUMN visibility SET DEFAULT 'private',
  ALTER COLUMN comments_enabled SET DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.videos'::regclass
      AND conname = 'videos_visibility_valid'
  ) THEN
    ALTER TABLE public.videos
      ADD CONSTRAINT videos_visibility_valid CHECK (visibility IN ('public', 'private'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS videos_visibility_created_at_idx
  ON public.videos (visibility, created_at DESC);

DROP POLICY IF EXISTS select_all_videos ON public.videos;
DROP POLICY IF EXISTS select_visible_videos ON public.videos;
CREATE POLICY select_visible_videos
  ON public.videos FOR SELECT
  TO anon, authenticated
  USING (visibility = 'public' OR owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS insert_own_videos ON public.videos;
CREATE POLICY insert_own_videos
  ON public.videos FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND visibility IN ('public', 'private')
  );

DROP POLICY IF EXISTS update_own_videos ON public.videos;
CREATE POLICY update_own_videos
  ON public.videos FOR UPDATE
  TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS delete_own_videos ON public.videos;
CREATE POLICY delete_own_videos
  ON public.videos FOR DELETE
  TO authenticated
  USING (owner_id = (SELECT auth.uid()));

REVOKE INSERT, DELETE ON public.videos FROM PUBLIC, anon, authenticated;
REVOKE UPDATE ON public.videos FROM PUBLIC, anon, authenticated;
GRANT INSERT (title, description, video_path, thumbnail_path, mime_type, file_size, video_type, visibility, comments_enabled)
  ON public.videos TO authenticated;
GRANT UPDATE (title, description, video_path, thumbnail_path, visibility, comments_enabled)
  ON public.videos TO authenticated;
GRANT DELETE ON public.videos TO authenticated;

DROP POLICY IF EXISTS "upload_own_video_files" ON storage.objects;
CREATE POLICY "upload_own_video_files" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'videos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "delete_own_video_files" ON storage.objects;
CREATE POLICY "delete_own_video_files" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'videos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "read_visible_video_files" ON storage.objects;
CREATE POLICY "read_visible_video_files" ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'videos'
    AND EXISTS (
      SELECT 1
      FROM public.videos AS v
      WHERE (v.video_path = storage.objects.name OR v.thumbnail_path = storage.objects.name)
        AND (v.visibility = 'public' OR v.owner_id = (SELECT auth.uid()))
    )
  );

UPDATE storage.buckets
SET public = false
WHERE id = 'videos';

DROP POLICY IF EXISTS video_comments_select_public ON public.video_comments;
CREATE POLICY video_comments_select_public
  ON public.video_comments FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.videos AS v
      WHERE v.id = video_comments.video_id
        AND v.comments_enabled
        AND (v.visibility = 'public' OR v.owner_id = (SELECT auth.uid()))
        AND v.video_type = 'standard'
    )
  );

DROP POLICY IF EXISTS video_comments_insert_own_standard_video ON public.video_comments;
CREATE POLICY video_comments_insert_own_standard_video
  ON public.video_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.videos AS v
      WHERE v.id = video_comments.video_id
        AND v.comments_enabled
        AND (v.visibility = 'public' OR v.owner_id = (SELECT auth.uid()))
        AND v.video_type = 'standard'
    )
  );

DROP POLICY IF EXISTS short_video_comments_select_public ON public.short_video_comments;
CREATE POLICY short_video_comments_select_public
  ON public.short_video_comments FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.videos AS v
      WHERE v.id = short_video_comments.video_id
        AND v.comments_enabled
        AND (v.visibility = 'public' OR v.owner_id = (SELECT auth.uid()))
        AND v.video_type = 'short'
    )
  );

DROP POLICY IF EXISTS short_video_comments_insert_own ON public.short_video_comments;
CREATE POLICY short_video_comments_insert_own
  ON public.short_video_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.videos AS v
      WHERE v.id = short_video_comments.video_id
        AND v.comments_enabled
        AND (v.visibility = 'public' OR v.owner_id = (SELECT auth.uid()))
        AND v.video_type = 'short'
    )
  );

DROP POLICY IF EXISTS video_likes_insert_own ON public.video_likes;
CREATE POLICY video_likes_insert_own
  ON public.video_likes FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.videos AS v
      WHERE v.id = video_likes.video_id
        AND v.visibility = 'public'
        AND v.video_type = 'standard'
    )
  );

DROP POLICY IF EXISTS short_video_likes_insert_own ON public.short_video_likes;
CREATE POLICY short_video_likes_insert_own
  ON public.short_video_likes FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.videos AS v
      WHERE v.id = short_video_likes.video_id
        AND v.visibility = 'public'
        AND v.video_type = 'short'
    )
  );

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
    AND (v.visibility = 'public' OR v.owner_id = (SELECT auth.uid()));
$$;

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
  GROUP BY l.video_id;
$$;

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
  IF NOT EXISTS (
    SELECT 1
    FROM public.videos AS v
    WHERE v.id = target_video_id
      AND (v.visibility = 'public' OR v.owner_id = current_viewer)
  ) THEN
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

CREATE OR REPLACE FUNCTION public.create_activity_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  video_owner_id uuid;
  source_event_key text;
BEGIN
  IF TG_TABLE_NAME = 'subscriptions' THEN
    IF NEW.subscriber_id <> NEW.channel_id THEN
      source_event_key := concat(
        'subscription:',
        NEW.subscriber_id::text,
        ':',
        NEW.channel_id::text,
        ':',
        extract(epoch FROM NEW.created_at)::text
      );
      INSERT INTO public.notifications (recipient_id, actor_id, type, channel_id, source_event_key)
      VALUES (NEW.channel_id, NEW.subscriber_id, 'channel_connected', NEW.channel_id, source_event_key)
      ON CONFLICT (recipient_id, type, source_event_key) DO NOTHING;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'videos' THEN
    IF NEW.visibility = 'public' THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type, video_id, channel_id, source_event_key)
      SELECT
        s.subscriber_id,
        NEW.owner_id,
        'new_video',
        NEW.id,
        NEW.owner_id,
        concat('video:', NEW.id::text)
      FROM public.subscriptions AS s
      WHERE s.channel_id = NEW.owner_id
        AND s.subscriber_id <> NEW.owner_id
      ON CONFLICT (recipient_id, type, source_event_key) DO NOTHING;
    END IF;
    RETURN NEW;
  END IF;

  SELECT v.owner_id INTO video_owner_id
  FROM public.videos AS v
  WHERE v.id = NEW.video_id
    AND v.visibility = 'public'
    AND v.comments_enabled;

  IF video_owner_id IS NOT NULL AND video_owner_id <> NEW.user_id THEN
    source_event_key := concat(TG_TABLE_NAME, ':', NEW.id::text);
    INSERT INTO public.notifications (recipient_id, actor_id, type, video_id, channel_id, source_event_key)
    VALUES (video_owner_id, NEW.user_id, 'new_comment', NEW.video_id, video_owner_id, source_event_key)
    ON CONFLICT (recipient_id, type, source_event_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.get_video_like_count(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_video_like_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_video_like_count(uuid) TO anon, authenticated;

ALTER FUNCTION public.get_short_video_like_counts(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_short_video_like_counts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_short_video_like_counts(uuid) TO anon, authenticated;

ALTER FUNCTION public.record_video_view(uuid) OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.record_video_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_video_view(uuid) TO anon, authenticated;

ALTER FUNCTION public.create_activity_notifications() OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.create_activity_notifications() FROM PUBLIC, anon, authenticated;
