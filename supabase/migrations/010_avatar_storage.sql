-- ============================================================
-- Migration 010: Avatar storage bucket + policies
-- ============================================================

-- Public bucket for avatars (URLs are public, uploads are auth-gated)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,   -- 2 MB max
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Anyone can read avatar files (bucket is public, but policy is belt-and-suspenders)
create policy "avatars_select_public"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Authenticated users can upload to their own folder (userId/filename)
create policy "avatars_insert_auth"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update/replace their own files
create policy "avatars_update_auth"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own files
create policy "avatars_delete_auth"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
