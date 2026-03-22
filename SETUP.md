# Inkwell - Supabase Setup Instructions

Follow these steps to set up your Supabase database and storage for Inkwell.

## Prerequisites

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy your credentials to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 1: Create Tables

Go to **Supabase Dashboard → SQL Editor** and run this SQL:

```sql
-- Create profiles table
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  full_name text,
  email text,
  bio text,
  description text,
  avatar_url text,
  website text,
  created_at timestamp default now()
);

-- Create blogs table
create table blogs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  content text not null,
  cover_image_url text,
  status text default 'draft' not null check (status in ('draft','published')),
  view_count integer default 0,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Create likes table
create table likes (
  id uuid default gen_random_uuid() primary key,
  blog_id uuid references blogs(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  created_at timestamp default now(),
  unique(blog_id, user_id)
);

-- Create comments table
create table comments (
  id uuid default gen_random_uuid() primary key,
  blog_id uuid references blogs(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp default now()
);

-- Add indexes for better performance
create index blogs_user_id_idx on blogs(user_id);
create index blogs_status_idx on blogs(status);
create index likes_blog_id_idx on likes(blog_id);
create index likes_user_id_idx on likes(user_id);
create index comments_blog_id_idx on comments(blog_id);
create index comments_user_id_idx on comments(user_id);
```

## Step 2: Enable Row Level Security (RLS)

```sql
-- Enable RLS on all tables
alter table profiles enable row level security;
alter table blogs enable row level security;
alter table likes enable row level security;
alter table comments enable row level security;
```

## Step 3: Create RLS Policies

### Profiles Policies

```sql
-- Anyone can view public profiles
create policy "Public profiles viewable" on profiles for select using (true);

-- Users can insert their own profile
create policy "Users insert own profile" on profiles for insert 
  with check (auth.uid() = id);

-- Users can update their own profile
create policy "Users update own profile" on profiles for update 
  using (auth.uid() = id);
```

### Blogs Policies

```sql
-- Anyone can read published blogs, owners can read their own
create policy "Public reads published blogs" on blogs for select 
  using (status = 'published' or auth.uid() = user_id);

-- Authors can insert blogs
create policy "Authors insert blogs" on blogs for insert 
  with check (auth.uid() = user_id);

-- Authors can update their own blogs
create policy "Authors update own blogs" on blogs for update 
  using (auth.uid() = user_id);

-- Authors can delete their own blogs
create policy "Authors delete own blogs" on blogs for delete 
  using (auth.uid() = user_id);
```

### Likes Policies

```sql
-- Anyone can view likes
create policy "Anyone can view likes" on likes for select using (true);

-- Authenticated users can like
create policy "Auth users like" on likes for insert 
  with check (auth.uid() = user_id);

-- Users can unlike their own likes
create policy "Users unlike" on likes for delete using (auth.uid() = user_id);
```

### Comments Policies

```sql
-- Anyone can view comments
create policy "Anyone can view comments" on comments for select using (true);

-- Authenticated users can comment
create policy "Auth users comment" on comments for insert 
  with check (auth.uid() = user_id);

-- Users can delete their own comments
create policy "Users delete own comments" on comments for delete 
  using (auth.uid() = user_id);
```

## Step 4: Create Storage Buckets

1. Go to **Supabase Dashboard → Storage**
2. Click **New Bucket** for each:

### Bucket 1: avatars
- Name: `avatars`
- Public: **YES**
- Allowed MIME types: `image/*`

### Bucket 2: blog-covers
- Name: `blog-covers`
- Public: **YES**
- Allowed MIME types: `image/*`

### Bucket 3: blog-images
- Name: `blog-images`
- Public: **YES**
- Allowed MIME types: `image/*`

## Step 5: Verify Setup

In Supabase Dashboard:

✅ Check **Tables**: profiles, blogs, likes, comments
✅ Check **Auth**: Enable email/password authentication
✅ Check **Storage**: 3 buckets created and public
✅ Check **Policies**: All RLS policies applied

## Step 6: Environment Variables

Ensure `.env.local` has:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Troubleshooting

### Error: "User not found"
- Ensure auth is enabled in Supabase
- Check email confirmation settings

### Error: "Permission denied"
- Verify RLS policies are created
- Check policy syntax matches your user ID

### Storage upload fails
- Verify bucket is public
- Check file size limits
- Ensure bucket name matches code

### Database connection fails
- Verify Supabase URL and key in `.env.local`
- Check internet connection
- Try refreshing Supabase dashboard

## Optional: Seed Sample Data

Once tables are created, you can add sample data:

```sql
-- Don't run this in production
-- Only for development/testing

-- Note: You would need to replace UUIDs with real auth user IDs
-- This is for reference only - use the app to create real data
```

---

**Setup complete!** Run `npm run dev` and start using Inkwell.
