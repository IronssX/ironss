CREATE OR REPLACE FUNCTION public.create_activity_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  video_owner_id uuid;
  v_source_event_key text;
BEGIN
  IF TG_TABLE_NAME = 'subscriptions' THEN
    IF NEW.subscriber_id <> NEW.channel_id THEN
      v_source_event_key := concat(
        'subscription:',
        NEW.subscriber_id::text,
        ':',
        NEW.channel_id::text,
        ':',
        extract(epoch FROM NEW.created_at)::text
      );
      INSERT INTO public.notifications (recipient_id, actor_id, type, channel_id, source_event_key)
      VALUES (NEW.channel_id, NEW.subscriber_id, 'channel_connected', NEW.channel_id, v_source_event_key)
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
    v_source_event_key := concat(TG_TABLE_NAME, ':', NEW.id::text);
    INSERT INTO public.notifications (recipient_id, actor_id, type, video_id, channel_id, source_event_key)
    VALUES (video_owner_id, NEW.user_id, 'new_comment', NEW.video_id, video_owner_id, v_source_event_key)
    ON CONFLICT (recipient_id, type, source_event_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
