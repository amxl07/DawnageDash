-- Create the storage bucket 'progress_photos'
INSERT INTO storage.buckets (id, name, public)
VALUES ('progress_photos', 'progress_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the bucket
-- Allow public access to view photos
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'progress_photos' );

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated Uploads"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'progress_photos' AND auth.role() = 'authenticated' );

-- Allow users to update/delete their own photos (Optional but recommended)
CREATE POLICY "User Update Own Photos"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'progress_photos' AND auth.uid() = owner );

CREATE POLICY "User Delete Own Photos"
ON storage.objects FOR DELETE
USING ( bucket_id = 'progress_photos' AND auth.uid() = owner );
