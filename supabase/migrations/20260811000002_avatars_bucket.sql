-- Public avatars bucket for admin uploads (toy app: anon can read/write).
-- Run in Supabase SQL Editor after init.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Reset policies for this bucket (idempotent-ish)
drop policy if exists "avatars public read" on storage.objects;
drop policy if exists "avatars anon upload" on storage.objects;
drop policy if exists "avatars anon update" on storage.objects;
drop policy if exists "avatars anon delete" on storage.objects;

create policy "avatars public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars anon upload"
  on storage.objects for insert
  with check (bucket_id = 'avatars');

create policy "avatars anon update"
  on storage.objects for update
  using (bucket_id = 'avatars')
  with check (bucket_id = 'avatars');

create policy "avatars anon delete"
  on storage.objects for delete
  using (bucket_id = 'avatars');
