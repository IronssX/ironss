DO $$
DECLARE
  v_table_oid oid;
  v_user_id_attnum smallint;
  v_index_oid oid;
  v_index_is_expected boolean;
BEGIN
  v_table_oid := to_regclass('public.video_likes');
  IF v_table_oid IS NULL THEN
    RAISE EXCEPTION 'Expected table public.video_likes to exist before hardening it.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class AS relation
    WHERE relation.oid = v_table_oid
      AND relation.relkind = 'r'
  ) THEN
    RAISE EXCEPTION 'public.video_likes must be an ordinary table.';
  END IF;

  IF (
    SELECT array_agg(attribute.attname::text ORDER BY attribute.attname::text)
    FROM pg_attribute AS attribute
    WHERE attribute.attrelid = v_table_oid
      AND attribute.attnum > 0
      AND NOT attribute.attisdropped
  ) IS DISTINCT FROM ARRAY['created_at', 'user_id', 'video_id']::text[] THEN
    RAISE EXCEPTION 'public.video_likes has an unexpected column set.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      VALUES
        ('video_id', 'uuid', true),
        ('user_id', 'uuid', true),
        ('created_at', 'timestamp with time zone', true)
    ) AS expected(column_name, formatted_type, is_not_null)
    WHERE NOT EXISTS (
      SELECT 1
      FROM pg_attribute AS attribute
      WHERE attribute.attrelid = v_table_oid
        AND attribute.attname = expected.column_name
        AND attribute.attnum > 0
        AND NOT attribute.attisdropped
        AND format_type(attribute.atttypid, attribute.atttypmod) = expected.formatted_type
        AND attribute.attnotnull = expected.is_not_null
    )
  ) THEN
    RAISE EXCEPTION 'public.video_likes column types or nullability do not match the expected schema.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attrdef AS default_value
    JOIN pg_attribute AS attribute
      ON attribute.attrelid = default_value.adrelid
      AND attribute.attnum = default_value.adnum
    WHERE default_value.adrelid = v_table_oid
      AND attribute.attname = 'created_at'
      AND pg_get_expr(default_value.adbin, default_value.adrelid) = 'now()'
  ) THEN
    RAISE EXCEPTION 'public.video_likes.created_at must default to now().';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_row
    WHERE constraint_row.conrelid = v_table_oid
      AND constraint_row.contype = 'p'
      AND constraint_row.conkey = ARRAY[
        (SELECT attribute.attnum FROM pg_attribute AS attribute
         WHERE attribute.attrelid = v_table_oid AND attribute.attname = 'video_id'),
        (SELECT attribute.attnum FROM pg_attribute AS attribute
         WHERE attribute.attrelid = v_table_oid AND attribute.attname = 'user_id')
      ]::smallint[]
      AND constraint_row.convalidated
  ) THEN
    RAISE EXCEPTION 'public.video_likes must have a validated primary key on (video_id, user_id).';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_row
    WHERE constraint_row.conrelid = v_table_oid
      AND constraint_row.contype = 'f'
      AND constraint_row.conkey = ARRAY[
        (SELECT attribute.attnum FROM pg_attribute AS attribute
         WHERE attribute.attrelid = v_table_oid AND attribute.attname = 'video_id')
      ]::smallint[]
      AND constraint_row.confrelid = to_regclass('public.videos')
      AND constraint_row.confkey = ARRAY[
        (SELECT attribute.attnum FROM pg_attribute AS attribute
         WHERE attribute.attrelid = to_regclass('public.videos') AND attribute.attname = 'id')
      ]::smallint[]
      AND constraint_row.confdeltype = 'c'
      AND constraint_row.convalidated
  ) THEN
    RAISE EXCEPTION 'public.video_likes.video_id must reference public.videos(id) with ON DELETE CASCADE.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_row
    WHERE constraint_row.conrelid = v_table_oid
      AND constraint_row.contype = 'f'
      AND constraint_row.conkey = ARRAY[
        (SELECT attribute.attnum FROM pg_attribute AS attribute
         WHERE attribute.attrelid = v_table_oid AND attribute.attname = 'user_id')
      ]::smallint[]
      AND constraint_row.confrelid = to_regclass('auth.users')
      AND constraint_row.confkey = ARRAY[
        (SELECT attribute.attnum FROM pg_attribute AS attribute
         WHERE attribute.attrelid = to_regclass('auth.users') AND attribute.attname = 'id')
      ]::smallint[]
      AND constraint_row.confdeltype = 'c'
      AND constraint_row.convalidated
  ) THEN
    RAISE EXCEPTION 'public.video_likes.user_id must reference auth.users(id) with ON DELETE CASCADE.';
  END IF;

  SELECT attribute.attnum
  INTO v_user_id_attnum
  FROM pg_attribute AS attribute
  WHERE attribute.attrelid = v_table_oid
    AND attribute.attname = 'user_id'
    AND attribute.attnum > 0
    AND NOT attribute.attisdropped;

  SELECT relation.oid
  INTO v_index_oid
  FROM pg_class AS relation
  JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname = 'video_likes_user_id_idx';

  IF v_index_oid IS NULL THEN
    EXECUTE 'CREATE INDEX video_likes_user_id_idx ON public.video_likes (user_id)';
  ELSE
    SELECT
      relation.relkind = 'i'
      AND index_row.indrelid = v_table_oid
      AND index_row.indisvalid
      AND NOT index_row.indisunique
      AND index_row.indnkeyatts = 1
      AND index_row.indnatts = 1
      AND index_row.indkey[0] = v_user_id_attnum
      AND index_row.indpred IS NULL
      AND index_row.indexprs IS NULL
      AND access_method.amname = 'btree'
    INTO v_index_is_expected
    FROM pg_class AS relation
    LEFT JOIN pg_index AS index_row ON index_row.indexrelid = relation.oid
    LEFT JOIN pg_am AS access_method ON access_method.oid = relation.relam
    WHERE relation.oid = v_index_oid;

    IF v_index_is_expected IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'public.video_likes_user_id_idx exists but does not match the expected index.';
    END IF;
  END IF;

  ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;

  REVOKE ALL ON TABLE public.video_likes FROM PUBLIC, anon, authenticated;
  REVOKE UPDATE (video_id, user_id, created_at)
    ON TABLE public.video_likes FROM PUBLIC, anon, authenticated;
  GRANT SELECT, INSERT, DELETE ON TABLE public.video_likes TO authenticated;
END;
$$;

DROP POLICY IF EXISTS video_likes_select_own ON public.video_likes;
DROP POLICY IF EXISTS video_likes_insert_own ON public.video_likes;
DROP POLICY IF EXISTS video_likes_delete_own ON public.video_likes;

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
REVOKE ALL ON FUNCTION public.get_video_like_count(uuid) FROM PUBLIC, anon, authenticated;
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
REVOKE ALL ON FUNCTION public.get_own_video_like_count() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_own_video_like_count() TO authenticated;
