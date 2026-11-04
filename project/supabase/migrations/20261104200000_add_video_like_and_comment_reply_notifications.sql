ALTER TABLE public.video_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id uuid;

ALTER TABLE public.short_video_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS video_comments_id_video_id_unique_idx
  ON public.video_comments (id, video_id);

CREATE UNIQUE INDEX IF NOT EXISTS short_video_comments_id_video_id_unique_idx
  ON public.short_video_comments (id, video_id);

CREATE INDEX IF NOT EXISTS video_comments_parent_comment_idx
  ON public.video_comments (parent_comment_id)
  WHERE parent_comment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS short_video_comments_parent_comment_idx
  ON public.short_video_comments (parent_comment_id)
  WHERE parent_comment_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.video_comments'::regclass
      AND conname = 'video_comments_parent_same_video_fk'
  ) THEN
    ALTER TABLE public.video_comments
      ADD CONSTRAINT video_comments_parent_same_video_fk
      FOREIGN KEY (parent_comment_id, video_id)
      REFERENCES public.video_comments (id, video_id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.short_video_comments'::regclass
      AND conname = 'short_video_comments_parent_same_video_fk'
  ) THEN
    ALTER TABLE public.short_video_comments
      ADD CONSTRAINT short_video_comments_parent_same_video_fk
      FOREIGN KEY (parent_comment_id, video_id)
      REFERENCES public.short_video_comments (id, video_id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.video_comments'::regclass
      AND conname = 'video_comments_parent_not_self_check'
  ) THEN
    ALTER TABLE public.video_comments
      ADD CONSTRAINT video_comments_parent_not_self_check
      CHECK (parent_comment_id IS NULL OR parent_comment_id <> id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.short_video_comments'::regclass
      AND conname = 'short_video_comments_parent_not_self_check'
  ) THEN
    ALTER TABLE public.short_video_comments
      ADD CONSTRAINT short_video_comments_parent_not_self_check
      CHECK (parent_comment_id IS NULL OR parent_comment_id <> id);
  END IF;
END;
$$;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check,
  DROP CONSTRAINT IF EXISTS notifications_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.notifications'::regclass
      AND conname = 'notifications_supported_type_check'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_supported_type_check
      CHECK (type IN ('channel_connected', 'new_video', 'new_comment', 'new_like', 'comment_reply'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.notifications'::regclass
      AND conname = 'notifications_target_valid_check'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_target_valid_check
      CHECK (
        (type = 'channel_connected' AND channel_id IS NOT NULL AND video_id IS NULL)
        OR (type IN ('new_video', 'new_comment', 'new_like', 'comment_reply') AND video_id IS NOT NULL)
      );
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_source_event_unique_idx
  ON public.notifications (recipient_id, type, source_event_key);

CREATE OR REPLACE FUNCTION public.create_activity_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  video_owner_id uuid;
  parent_comment_owner_id uuid;
  source_event_key text;
  expected_video_type text;
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
    IF NEW.visibility = 'public' AND NOT NEW.privacy_transition_pending THEN
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

  IF TG_TABLE_NAME IN ('video_likes', 'short_video_likes') THEN
    expected_video_type := CASE
      WHEN TG_TABLE_NAME = 'video_likes' THEN 'standard'
      ELSE 'short'
    END;

    SELECT v.owner_id
    INTO video_owner_id
    FROM public.videos AS v
    WHERE v.id = NEW.video_id
      AND v.video_type = expected_video_type
      AND v.visibility = 'public'
      AND NOT v.privacy_transition_pending;

    IF video_owner_id IS NOT NULL AND video_owner_id <> NEW.user_id THEN
      source_event_key := concat(
        'like:',
        TG_TABLE_NAME,
        ':',
        NEW.video_id::text,
        ':',
        NEW.user_id::text,
        ':',
        txid_current()::text
      );
      INSERT INTO public.notifications (recipient_id, actor_id, type, video_id, source_event_key)
      VALUES (video_owner_id, NEW.user_id, 'new_like', NEW.video_id, source_event_key)
      ON CONFLICT (recipient_id, type, source_event_key) DO NOTHING;
    END IF;
    RETURN NEW;
  END IF;

  SELECT v.owner_id
  INTO video_owner_id
  FROM public.videos AS v
  WHERE v.id = NEW.video_id
    AND v.visibility = 'public'
    AND NOT v.privacy_transition_pending
    AND v.comments_enabled;

  IF video_owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_comment_id IS NOT NULL THEN
    EXECUTE format(
      'SELECT comment.user_id FROM public.%I AS comment WHERE comment.id = $1 AND comment.video_id = $2',
      TG_TABLE_NAME
    )
    INTO parent_comment_owner_id
    USING NEW.parent_comment_id, NEW.video_id;

    IF parent_comment_owner_id IS NOT NULL
       AND parent_comment_owner_id <> NEW.user_id THEN
      source_event_key := concat(TG_TABLE_NAME, ':reply:', NEW.id::text);
      INSERT INTO public.notifications (recipient_id, actor_id, type, video_id, source_event_key)
      VALUES (parent_comment_owner_id, NEW.user_id, 'comment_reply', NEW.video_id, source_event_key)
      ON CONFLICT (recipient_id, type, source_event_key) DO NOTHING;
    END IF;
  END IF;

  IF video_owner_id <> NEW.user_id
     AND video_owner_id IS DISTINCT FROM parent_comment_owner_id THEN
    source_event_key := concat(TG_TABLE_NAME, ':', NEW.id::text);
    INSERT INTO public.notifications (recipient_id, actor_id, type, video_id, channel_id, source_event_key)
    VALUES (video_owner_id, NEW.user_id, 'new_comment', NEW.video_id, video_owner_id, source_event_key)
    ON CONFLICT (recipient_id, type, source_event_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.create_activity_notifications() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_activity_notifications() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notifications_on_standard_video_like ON public.video_likes;
CREATE TRIGGER notifications_on_standard_video_like
  AFTER INSERT ON public.video_likes
  FOR EACH ROW EXECUTE FUNCTION public.create_activity_notifications();

DROP TRIGGER IF EXISTS notifications_on_short_video_like ON public.short_video_likes;
CREATE TRIGGER notifications_on_short_video_like
  AFTER INSERT ON public.short_video_likes
  FOR EACH ROW EXECUTE FUNCTION public.create_activity_notifications();

DROP TRIGGER IF EXISTS notifications_on_channel_connected ON public.subscriptions;
CREATE TRIGGER notifications_on_channel_connected
  AFTER INSERT ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.create_activity_notifications();

DROP TRIGGER IF EXISTS notifications_on_new_video ON public.videos;
CREATE TRIGGER notifications_on_new_video
  AFTER INSERT ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.create_activity_notifications();

DROP TRIGGER IF EXISTS notifications_on_standard_video_comment ON public.video_comments;
CREATE TRIGGER notifications_on_standard_video_comment
  AFTER INSERT ON public.video_comments
  FOR EACH ROW EXECUTE FUNCTION public.create_activity_notifications();

DROP TRIGGER IF EXISTS notifications_on_clip_comment ON public.short_video_comments;
CREATE TRIGGER notifications_on_clip_comment
  AFTER INSERT ON public.short_video_comments
  FOR EACH ROW EXECUTE FUNCTION public.create_activity_notifications();
