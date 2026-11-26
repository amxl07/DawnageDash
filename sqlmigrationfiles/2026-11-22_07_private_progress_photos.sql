-- B4: progress photos were in a public, listable bucket, and any signed-in user
-- could upload into any folder. Make the bucket private: owner, assigned coach
-- and admins may read; only the owner may write into their own folder.
-- Replaces the 2026-09-19 manual-grant design (owner decision 2026-11-22).
-- Prerequisite: the dashboard deploy that displays photos via signed URLs (main e0b6ad1).
-- Stored legacy public URLs need no rewrite: both apps convert them to paths and sign them.

create or replace function public.progress_photo_can_read(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.users u
    where u.id::text = split_part(object_name, '/', 1)
      and (u.id = auth.uid() or u.coach_id = auth.uid())
  ) or public.is_admin();
$$;
revoke execute on function public.progress_photo_can_read(text) from public, anon;
grant execute on function public.progress_photo_can_read(text) to authenticated;

update storage.buckets
set public = false,
    file_size_limit = 20971520,          -- 20 MB
    allowed_mime_types = array['image/*']
where id = 'progress_photos';

drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Authenticated Uploads" on storage.objects;
drop policy if exists "User Update Own Photos" on storage.objects;
drop policy if exists "User Delete Own Photos" on storage.objects;

create policy "Progress photos: owner, coach, admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'progress_photos' and public.progress_photo_can_read(name));

create policy "Progress photos: owner uploads to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'progress_photos' and split_part(name, '/', 1) = (select auth.uid())::text);

create policy "Progress photos: owner updates own files" on storage.objects
  for update to authenticated
  using (bucket_id = 'progress_photos' and split_part(name, '/', 1) = (select auth.uid())::text)
  with check (bucket_id = 'progress_photos' and split_part(name, '/', 1) = (select auth.uid())::text);

create policy "Progress photos: owner deletes own files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'progress_photos' and split_part(name, '/', 1) = (select auth.uid())::text);
