/*
# Create videos storage bucket

1. New Storage
- `videos` bucket for uploaded video files and their thumbnail images.
- Files are readable by URL so the video player and home page can display them. Visitors cannot list the bucket.
- Size limit: 200 MB per file (the app enforces a lower, configurable limit of 100 MB for videos).
- Allowed types: MP4 and WebM videos, JPEG, PNG and WebP images.

2. Security
- Only signed-in users can upload, and only inside their own folder named after their user ID.
- Users can delete files only from their own folder; this is used to clean up files when saving a video record fails.
- No update policy exists, so an existing file cannot be overwritten.

3. Important notes
- If you change the app's video size limit, keep this bucket limit at or above it.
- Re-running this migration is safe.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  true,
  209715200,
  ARRAY['video/mp4', 'video/webm', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "upload_own_video_files" ON storage.objects;
CREATE POLICY "upload_own_video_files" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "delete_own_video_files" ON storage.objects;
CREATE POLICY "delete_own_video_files" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
