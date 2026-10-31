CREATE TABLE IF NOT EXISTS public.video_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS video_comments_video_created_idx
  ON public.video_comments (video_id, created_at DESC);

ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.video_comments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.video_comments TO anon, authenticated;
GRANT INSERT, DELETE ON public.video_comments TO authenticated;

DROP POLICY IF EXISTS video_comments_select_public ON public.video_comments;
CREATE POLICY video_comments_select_public
  ON public.video_comments FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS video_comments_insert_own_standard_video ON public.video_comments;
CREATE POLICY video_comments_insert_own_standard_video
  ON public.video_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.videos
      WHERE videos.id = video_comments.video_id
        AND videos.video_type = 'standard'
    )
  );

DROP POLICY IF EXISTS video_comments_delete_own ON public.video_comments;
CREATE POLICY video_comments_delete_own
  ON public.video_comments FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('channel_connected', 'new_video', 'new_comment')),
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_event_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CHECK (
    (type = 'channel_connected' AND channel_id IS NOT NULL AND video_id IS NULL)
    OR (type IN ('new_video', 'new_comment') AND video_id IS NOT NULL)
  )
);

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS source_event_key text;

CREATE INDEX IF NOT EXISTS notifications_recipient_created_idx
  ON public.notifications (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_unread_recipient_idx
  ON public.notifications (recipient_id)
  WHERE read_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_source_event_unique_idx
  ON public.notifications (recipient_id, type, source_event_key);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own
  ON public.notifications FOR SELECT
  TO authenticated
  USING (recipient_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = (SELECT auth.uid()))
  WITH CHECK (recipient_id = (SELECT auth.uid()));

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
    RETURN NEW;
  END IF;

  SELECT v.owner_id
  INTO video_owner_id
  FROM public.videos AS v
  WHERE v.id = NEW.video_id;

  IF video_owner_id IS NOT NULL AND video_owner_id <> NEW.user_id THEN
    source_event_key := concat(TG_TABLE_NAME, ':', NEW.id::text);
    INSERT INTO public.notifications (recipient_id, actor_id, type, video_id, channel_id, source_event_key)
    VALUES (video_owner_id, NEW.user_id, 'new_comment', NEW.video_id, video_owner_id, source_event_key)
    ON CONFLICT (recipient_id, type, source_event_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_activity_notifications() FROM PUBLIC, anon, authenticated;

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

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'notifications'
    )
  THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END;
$$;
