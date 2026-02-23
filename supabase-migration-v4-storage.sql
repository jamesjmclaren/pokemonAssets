-- PokeVault - Schema Migration v4: Storage bucket policies
-- Run this in your Supabase SQL Editor
-- Fixes: "new row violates row-level security policy" on image upload

-- Ensure the asset-images bucket exists and is public
insert into storage.buckets (id, name, public)
values ('asset-images', 'asset-images', true)
on conflict (id) do update set public = true;

-- Allow uploads (INSERT) for all users (Clerk handles auth at application level)
create policy "Allow public uploads to asset-images"
  on storage.objects for insert
  with check (bucket_id = 'asset-images');

-- Allow reading images (SELECT) for all users
create policy "Allow public reads from asset-images"
  on storage.objects for select
  using (bucket_id = 'asset-images');

-- Allow deleting images (DELETE) for all users
create policy "Allow public deletes from asset-images"
  on storage.objects for delete
  using (bucket_id = 'asset-images');
