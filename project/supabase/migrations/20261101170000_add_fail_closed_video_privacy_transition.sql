ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS privacy_transition_pending boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS privacy_transition_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_transition_video_path text,
  ADD COLUMN IF NOT EXISTS privacy_transition_thumbnail_path text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.videos'::regclass
      AND conname = 'videos_privacy_transition_state_valid'
  ) THEN
    ALTER TABLE public.videos
      ADD CONSTRAINT videos_privacy_transition_state_valid
      CHECK (
        (privacy_transition_pending = false
          AND privacy_transition_started_at IS NULL
          AND privacy_transition_video_path IS NULL
          AND privacy_transition_thumbnail_path IS NULL)
        OR
        (privacy_transition_pending = true
          AND visibility = 'public'
          AND privacy_transition_started_at IS NOT NULL
          AND privacy_transition_video_path IS NOT NULL)
      );
  END IF;
END;
$$;

REVOKE UPDATE (privacy_transition_started_at, privacy_transition_video_path, privacy_transition_thumbnail_path)
  ON public.videos FROM PUBLIC, anon, authenticated;
GRANT UPDATE (privacy_transition_pending) ON public.videos TO authenticated;

CREATE OR REPLACE FUNCTION public.require_private_video_path_rotation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.privacy_transition_pending THEN
    IF OLD.visibility = 'public'
       AND NEW.visibility = 'public'
       AND NEW.privacy_transition_pending
       AND OLD.video_path IS NOT DISTINCT FROM NEW.video_path
       AND OLD.thumbnail_path IS NOT DISTINCT FROM NEW.thumbnail_path THEN
      RETURN NEW;
    END IF;

    IF OLD.visibility = 'public'
       AND NEW.visibility = 'private'
       AND NOT NEW.privacy_transition_pending
       AND OLD.video_path IS DISTINCT FROM OLD.privacy_transition_video_path
       AND (
         OLD.privacy_transition_thumbnail_path IS NULL
         OR OLD.thumbnail_path IS DISTINCT FROM OLD.privacy_transition_thumbnail_path
       )
       AND EXISTS (
         SELECT 1
         FROM public.video_storage_cleanup_queue AS cleanup
         WHERE cleanup.video_id = OLD.id
           AND cleanup.owner_id = OLD.owner_id
           AND cleanup.object_path = OLD.privacy_transition_video_path
           AND cleanup.reason = 'path_changed'
           AND cleanup.created_at >= OLD.privacy_transition_started_at
           AND cleanup.completed_at IS NOT NULL
       )
       AND (
         OLD.privacy_transition_thumbnail_path IS NULL
         OR EXISTS (
           SELECT 1
           FROM public.video_storage_cleanup_queue AS cleanup
           WHERE cleanup.video_id = OLD.id
             AND cleanup.owner_id = OLD.owner_id
             AND cleanup.object_path = OLD.privacy_transition_thumbnail_path
             AND cleanup.reason = 'path_changed'
             AND cleanup.created_at >= OLD.privacy_transition_started_at
             AND cleanup.completed_at IS NOT NULL
         )
       )
       AND NOT EXISTS (
         SELECT 1
         FROM public.video_storage_cleanup_queue AS cleanup
         WHERE cleanup.video_id = OLD.id
           AND cleanup.owner_id = OLD.owner_id
           AND cleanup.created_at >= OLD.privacy_transition_started_at
           AND cleanup.completed_at IS NULL
       ) THEN
      NEW.privacy_transition_started_at := NULL;
      NEW.privacy_transition_video_path := NULL;
      NEW.privacy_transition_thumbnail_path := NULL;
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'The pending privacy transition must finish its media cleanup before the video can become private';
  END IF;

  IF OLD.visibility = 'public' AND NEW.visibility = 'public'
     AND NOT OLD.privacy_transition_pending
     AND NEW.privacy_transition_pending THEN
    IF OLD.video_path IS NOT DISTINCT FROM NEW.video_path THEN
      RAISE EXCEPTION 'A public video must be copied to a new storage path before a privacy transition';
    END IF;
    IF OLD.thumbnail_path IS NOT NULL
       AND OLD.thumbnail_path IS NOT DISTINCT FROM NEW.thumbnail_path THEN
      RAISE EXCEPTION 'A public thumbnail must be copied to a new storage path before a privacy transition';
    END IF;

    NEW.privacy_transition_started_at := now();
    NEW.privacy_transition_video_path := OLD.video_path;
    NEW.privacy_transition_thumbnail_path := OLD.thumbnail_path;
    RETURN NEW;
  END IF;

  IF OLD.visibility = 'public' AND NEW.visibility = 'private' THEN
    RAISE EXCEPTION 'A public video must complete its storage cleanup before becoming private';
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.require_private_video_path_rotation() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.require_private_video_path_rotation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS videos_require_private_path_rotation ON public.videos;
CREATE TRIGGER videos_require_private_path_rotation
  BEFORE UPDATE OF visibility, video_path, thumbnail_path, privacy_transition_pending
  ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.require_private_video_path_rotation();
