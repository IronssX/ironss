CREATE TABLE IF NOT EXISTS public.video_storage_cleanup_queue (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  video_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  object_path text NOT NULL,
  reason text NOT NULL CHECK (reason IN ('path_changed', 'video_deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error text,
  completed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS video_storage_cleanup_pending_path_idx
  ON public.video_storage_cleanup_queue (object_path)
  WHERE completed_at IS NULL;

CREATE INDEX IF NOT EXISTS video_storage_cleanup_owner_video_idx
  ON public.video_storage_cleanup_queue (owner_id, video_id, id)
  WHERE completed_at IS NULL;

ALTER TABLE public.video_storage_cleanup_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.video_storage_cleanup_queue FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_storage_cleanup_queue TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.video_storage_cleanup_queue_id_seq TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_video_storage_cleanup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.video_storage_cleanup_queue (video_id, owner_id, object_path, reason)
    VALUES (OLD.id, OLD.owner_id, OLD.video_path, 'video_deleted')
    ON CONFLICT (object_path) WHERE completed_at IS NULL DO NOTHING;
    IF OLD.thumbnail_path IS NOT NULL THEN
      INSERT INTO public.video_storage_cleanup_queue (video_id, owner_id, object_path, reason)
      VALUES (OLD.id, OLD.owner_id, OLD.thumbnail_path, 'video_deleted')
      ON CONFLICT (object_path) WHERE completed_at IS NULL DO NOTHING;
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.video_path IS DISTINCT FROM NEW.video_path THEN
    INSERT INTO public.video_storage_cleanup_queue (video_id, owner_id, object_path, reason)
    VALUES (OLD.id, OLD.owner_id, OLD.video_path, 'path_changed')
    ON CONFLICT (object_path) WHERE completed_at IS NULL DO NOTHING;
  END IF;

  IF OLD.thumbnail_path IS DISTINCT FROM NEW.thumbnail_path
     AND OLD.thumbnail_path IS NOT NULL THEN
    INSERT INTO public.video_storage_cleanup_queue (video_id, owner_id, object_path, reason)
    VALUES (OLD.id, OLD.owner_id, OLD.thumbnail_path, 'path_changed')
    ON CONFLICT (object_path) WHERE completed_at IS NULL DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.enqueue_video_storage_cleanup() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.enqueue_video_storage_cleanup() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS videos_enqueue_storage_cleanup ON public.videos;
CREATE TRIGGER videos_enqueue_storage_cleanup
  AFTER UPDATE OF video_path, thumbnail_path OR DELETE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_video_storage_cleanup();

CREATE OR REPLACE FUNCTION public.require_private_video_path_rotation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.visibility = 'public' AND NEW.visibility = 'private' THEN
    IF OLD.video_path IS NOT DISTINCT FROM NEW.video_path THEN
      RAISE EXCEPTION 'A public video must be moved to a new storage path before becoming private';
    END IF;
    IF OLD.thumbnail_path IS NOT NULL
       AND OLD.thumbnail_path IS NOT DISTINCT FROM NEW.thumbnail_path THEN
      RAISE EXCEPTION 'A public thumbnail must be moved to a new storage path before becoming private';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.require_private_video_path_rotation() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.require_private_video_path_rotation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS videos_require_private_path_rotation ON public.videos;
CREATE TRIGGER videos_require_private_path_rotation
  BEFORE UPDATE OF visibility ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.require_private_video_path_rotation();
