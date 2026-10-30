/*
# Create private-owner avatars storage bucket

1. New Storage
- `avatars` bucket for profile photos. Files are publicly readable by URL so photos can be displayed, with a 2 MB size limit and JPEG, PNG or WebP only.

2. Security
- Only signed-in users can upload or delete files, and only inside their own folder named after their user ID.
- No listing policy is added, so visitors cannot browse the bucket; they can only open a photo if they know its address.

3. Important notes
- Re-running this migration is safe: the bucket settings are updated and policies are replaced.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "upload_own_avatar" ON storage.objects;
CREATE POLICY "upload_own_avatar" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "delete_own_avatar" ON storage.objects;
CREATE POLICY "delete_own_avatar" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
