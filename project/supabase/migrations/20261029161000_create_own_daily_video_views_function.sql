CREATE OR REPLACE FUNCTION public.get_own_daily_video_views()
RETURNS TABLE(view_date date, view_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (views.viewed_at AT TIME ZONE 'UTC')::date AS view_date,
         count(*)::bigint AS view_count
  FROM public.video_views AS views
  INNER JOIN public.videos AS videos ON videos.id = views.video_id
  WHERE videos.owner_id = auth.uid()
    AND views.viewed_at >= now() - interval '30 days'
  GROUP BY (views.viewed_at AT TIME ZONE 'UTC')::date
  ORDER BY view_date;
$$;

REVOKE ALL ON FUNCTION public.get_own_daily_video_views() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_own_daily_video_views() TO authenticated;