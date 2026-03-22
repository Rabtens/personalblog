# Inkwell - A Premium Personal Blog Platform

A beautifully designed personal blog platform built with Next.js 14, Supabase, and Tailwind CSS. Features dark editorial design, rich text editing with TipTap, image uploads, comments, and likes.

## 🎨 Design Aesthetic

- **Background**: Deep black (#0F0F0F)
- **Cards**: Navy (#1A1A2E)
- **Accent**: Crimson red (#E94560)
- **Text**: Off-white (#EAEAEA)
- **Typography**: Playfair Display (headings), Inter (body)
- **Feel**: Premium Medium/Substack hybrid with glassmorphism effects

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database/Auth**: Supabase
- **Styling**: Tailwind CSS 4
- **Editor**: TipTap (rich text)
- **Icons**: Lucide React
- **Storage**: Supabase Storage
- **Forms**: React Hook Form + Zod
- **Notifications**: React Hot Toast

## 📋 Quick Setup Guide

### 1. Clone & Install

```bash
cd my-blog
npm install
```

### 2. Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy your credentials to `.env.local` (already included)
3. Run the SQL schema from SETUP.md in Supabase SQL Editor
4. Create Storage Buckets: `avatars`, `blog-covers`, `blog-images` (all Public)

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
my-blog/
├── app/
│   ├── layout.tsx              # Root layout with fonts & navbar
│   ├── page.tsx                # Public home page
│   ├── globals.css             # Global styles
│   ├── auth/
│   │   ├── signin/page.tsx     # Sign in page
│   │   └── signup/page.tsx     # Sign up page
│   ├── dashboard/
│   │   └── page.tsx            # User dashboard (drafts & published)
│   ├── write/
│   │   ├── page.tsx            # New blog editor
│   │   └── [id]/page.tsx       # Edit existing blog
│   ├── blog/
│   │   └── [id]/page.tsx       # Public blog reading page
│   └── profile/
│       ├── page.tsx            # Own profile editor
│       └── [username]/page.tsx # Public profile view
├── components/
│   ├── Navbar.tsx              # Top navigation bar
│   ├── BlogCard.tsx            # Reusable blog card component
│   ├── Editor.tsx              # TipTap rich text editor
│   └── editor.css              # Editor styling
├── lib/
│   └── supabase.ts             # Supabase client & helpers
├── middleware.ts               # Route protection
├── tailwind.config.ts          # Tailwind configuration
└── .env.local                  # Environment variables (configured)
```

## 🚀 Features

- **Authentication**: Sign up, sign in, profile creation
- **Blog Management**: Create (rich text), edit, publish, unpublish, delete
- **Editor**: TipTap with formatting, tables, images, code blocks
- **Engagement**: Comments, likes, view counter
- **Profiles**: Customizable public profiles with stats
- **Dashboard**: Manage all your blogs with stats
- **Responsive**: Mobile-first, hamburger menu
- **Storage**: Images uploaded to Supabase Storage

## 🔐 Security

- Row-level security on all Supabase tables
- Protected routes with middleware
- Users can only edit/delete own content
- Public read for published content

## 📚 Key Pages

- **/** - Public home with featured blogs
- **/auth/signin** - Sign in
- **/auth/signup** - Create account
- **/write** - Create new blog
- **/write/[id]** - Edit blog
- **/dashboard** - Your blogs (drafts & published)
- **/blog/[id]** - Read blog (with comments, likes)
- **/profile** - Edit your profile
- **/profile/[username]** - View public profile

## 🎯 Available Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm start         # Start production server
```

---


# personalblog
