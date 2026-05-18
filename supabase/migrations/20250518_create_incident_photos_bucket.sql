/*
  # Storage bucket for incident report photos

  1. Storage Bucket
    - `incident-photos` — public read, authenticated upload
    - 10MB limit, image MIME types only

  2. Storage Policies
    - Public SELECT on bucket objects
    - Authenticated INSERT into bucket
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'incident-photos',
  'incident-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload incident photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload incident photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'incident-photos');

DROP POLICY IF EXISTS "Public can view incident photos" ON storage.objects;
CREATE POLICY "Public can view incident photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'incident-photos');
