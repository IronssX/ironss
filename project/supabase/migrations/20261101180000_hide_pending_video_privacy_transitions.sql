DROP POLICY IF EXISTS select_visible_videos ON public.videos;
CREATE POLICY select_visible_videos
  ON public.videos FOR SELECT
  TO anon, authenticated
  USING (
    (visibility = 'public' AND NOT privacy_transition_pending)
    OR owner_id = (SELECT auth.uid())
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
        AND (
          (v.visibility = 'public' AND NOT v.privacy_transition_pending)
          OR v.owner_id = (SELECT auth.uid())
        )
    )
  );
