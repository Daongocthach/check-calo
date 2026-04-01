-- Supabase policies for anonymous/authenticated image sync in check-calo
-- Run this in the SQL Editor of the current Supabase project.

-- Ensure the bucket exists.
insert into storage.buckets (id, name, public)
values ('food-entry-images', 'food-entry-images', true)
on conflict (id) do update
set public = excluded.public;

-- Enable RLS on the app table if it is not already enabled.
alter table public.food_entries enable row level security;

-- Remove old policies so the script can be re-run safely.
drop policy if exists "food_entries_select_own" on public.food_entries;
drop policy if exists "food_entries_insert_own" on public.food_entries;
drop policy if exists "food_entries_update_own" on public.food_entries;
drop policy if exists "food_entries_delete_own" on public.food_entries;

drop policy if exists "storage_select_food_entry_images_own" on storage.objects;
drop policy if exists "storage_insert_food_entry_images_own" on storage.objects;
drop policy if exists "storage_update_food_entry_images_own" on storage.objects;
drop policy if exists "storage_delete_food_entry_images_own" on storage.objects;

-- Allow each signed-in user, including anonymous users, to manage only their own food entries.
create policy "food_entries_select_own"
on public.food_entries
for select
to authenticated
using (auth.uid() = user_id);

create policy "food_entries_insert_own"
on public.food_entries
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "food_entries_update_own"
on public.food_entries
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "food_entries_delete_own"
on public.food_entries
for delete
to authenticated
using (auth.uid() = user_id);

-- Helper rule:
-- The app uploads to paths like users/<auth.uid()>/food-entries/<entry-id>.jpg

create policy "storage_select_food_entry_images_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'food-entry-images'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = auth.uid()::text
  and (storage.foldername(name))[3] = 'food-entries'
);

create policy "storage_insert_food_entry_images_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'food-entry-images'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = auth.uid()::text
  and (storage.foldername(name))[3] = 'food-entries'
);

create policy "storage_update_food_entry_images_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'food-entry-images'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = auth.uid()::text
  and (storage.foldername(name))[3] = 'food-entries'
)
with check (
  bucket_id = 'food-entry-images'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = auth.uid()::text
  and (storage.foldername(name))[3] = 'food-entries'
);

create policy "storage_delete_food_entry_images_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'food-entry-images'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = auth.uid()::text
  and (storage.foldername(name))[3] = 'food-entries'
);
