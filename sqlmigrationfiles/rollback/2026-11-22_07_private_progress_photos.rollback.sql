-- Restores the public, listable progress photo bucket (pre-2026-11-22).
-- WARNING: this re-exposes every progress photo to anyone with a link or the public key.
drop policy if exists "Progress photos: owner, coach, admin read" on storage.objects;
drop policy if exists "Progress photos: owner uploads to own folder" on storage.objects;
drop policy if exists "Progress photos: owner updates own files" on storage.objects;
drop policy if exists "Progress photos: owner deletes own files" on storage.objects;
update storage.buckets set public = true, file_size_limit = null, allowed_mime_types = null where id = 'progress_photos';
create policy "Public Access" on storage.objects for select using (bucket_id = 'progress_photos');
create policy "Authenticated Uploads" on storage.objects for insert with check (bucket_id = 'progress_photos' and auth.role() = 'authenticated');
create policy "User Update Own Photos" on storage.objects for update using (bucket_id = 'progress_photos' and auth.uid() = owner);
create policy "User Delete Own Photos" on storage.objects for delete using (bucket_id = 'progress_photos' and auth.uid() = owner);
drop function if exists public.progress_photo_can_read(text);
