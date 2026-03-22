-- ============================================
-- COMPLETE SUPABASE SETUP SQL
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CREATE FUNCTION TO AUTO-CREATE PROFILE
-- ============================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, username)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'username'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ============================================
-- 2. CREATE TRIGGER FOR AUTO-PROFILE
-- ============================================

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- 3. RLS POLICIES FOR PROFILES TABLE
-- ============================================

alter table profiles enable row level security;

drop policy if exists "Users can view their own profile" on profiles;
drop policy if exists "Users can update their own profile" on profiles;
drop policy if exists "Public can view published profiles" on profiles;

create policy "Users can view their own profile"
on profiles for select
using (auth.uid() = id);

create policy "Users can update their own profile"
on profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- ============================================
-- 4. RLS POLICIES FOR BLOGS TABLE
-- ============================================

alter table blogs enable row level security;

drop policy if exists "Authors insert blogs" on blogs;
drop policy if exists "Authors update own blogs" on blogs;
drop policy if exists "Authors delete own blogs" on blogs;
drop policy if exists "Public reads published blogs" on blogs;
drop policy if exists "Authors read own blogs" on blogs;

create policy "Authors insert blogs" 
on blogs for insert 
with check (auth.uid() = user_id);

create policy "Authors update own blogs" 
on blogs for update 
using (auth.uid() = user_id) 
with check (auth.uid() = user_id);

create policy "Authors delete own blogs"
on blogs for delete
using (auth.uid() = user_id);

create policy "Authors read own blogs"
on blogs for select
using (auth.uid() = user_id);

create policy "Public reads published blogs" 
on blogs for select 
using (status = 'published');

-- ============================================
-- 5. RLS POLICIES FOR LIKES TABLE
-- ============================================

alter table likes enable row level security;

drop policy if exists "Users can view likes" on likes;
drop policy if exists "Users can create likes" on likes;
drop policy if exists "Users can delete own likes" on likes;

create policy "Users can view likes"
on likes for select
using (true);

create policy "Users can create likes"
on likes for insert
with check (auth.uid() = user_id);

create policy "Users can delete own likes"
on likes for delete
using (auth.uid() = user_id);

-- ============================================
-- 6. RLS POLICIES FOR COMMENTS TABLE
-- ============================================

alter table comments enable row level security;

drop policy if exists "Users can view comments" on comments;
drop policy if exists "Users can create comments" on comments;
drop policy if exists "Users can update own comments" on comments;
drop policy if exists "Users can delete own comments" on comments;

create policy "Users can view comments"
on comments for select
using (true);

create policy "Users can create comments"
on comments for insert
with check (auth.uid() = user_id);

create policy "Users can update own comments"
on comments for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own comments"
on comments for delete
using (auth.uid() = user_id);

-- ============================================
-- 7. STORAGE BUCKET RLS POLICIES
-- ============================================

-- Blog Covers Bucket Policies
insert into storage.buckets (id, name, public)
values ('blog-covers', 'blog-covers', true)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can upload blog covers" on storage.objects;
drop policy if exists "Public can read blog covers" on storage.objects;
drop policy if exists "Users can delete own blog covers" on storage.objects;

create policy "Authenticated users can upload blog covers"
on storage.objects for insert
to authenticated
with check (bucket_id = 'blog-covers');

create policy "Public can read blog covers"
on storage.objects for select
to public
using (bucket_id = 'blog-covers');

create policy "Users can delete own blog covers"
on storage.objects for delete
to authenticated
using (bucket_id = 'blog-covers' AND auth.uid()::text = owner);

-- Blog Images Bucket Policies
insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can upload blog images" on storage.objects;
drop policy if exists "Public can read blog images" on storage.objects;
drop policy if exists "Users can delete own blog images" on storage.objects;

create policy "Authenticated users can upload blog images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'blog-images');

create policy "Public can read blog images"
on storage.objects for select
to public
using (bucket_id = 'blog-images');

create policy "Users can delete own blog images"
on storage.objects for delete
to authenticated
using (bucket_id = 'blog-images' AND auth.uid()::text = owner);

-- Avatars Bucket Policies
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can upload avatars" on storage.objects;
drop policy if exists "Public can read avatars" on storage.objects;
drop policy if exists "Users can delete own avatars" on storage.objects;

create policy "Authenticated users can upload avatars"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars');

create policy "Public can read avatars"
on storage.objects for select
to public
using (bucket_id = 'avatars');

create policy "Users can delete own avatars"
on storage.objects for delete
to authenticated
using (bucket_id = 'avatars' AND auth.uid()::text = owner);

-- ============================================
-- DONE! All policies configured
-- ============================================
