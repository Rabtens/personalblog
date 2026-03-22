'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Loader, Mail, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  bio: string | null;
  description: string | null;
  website: string | null;
  avatar_url: string | null;
}

interface Blog {
  id: string;
  title: string;
  content: string;
  cover_image_url: string | null;
  created_at: string;
  view_count: number;
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [stats, setStats] = useState({
    totalBlogs: 0,
    totalLikes: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Load profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single();

        if (profileError || !profileData) {
          toast.error('Profile not found');
          router.push('/');
          return;
        }

        setProfile(profileData as Profile);

        // Load published blogs
        const { data: blogsData } = await supabase
          .from('blogs')
          .select('*')
          .eq('user_id', profileData.id)
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        setBlogs((blogsData || []) as Blog[]);

        // Load stats
        const { data: likes } = await supabase
          .from('likes')
          .select('id')
          .in(
            'blog_id',
            blogsData?.map((b) => b.id) || []
          );

        setStats({
          totalBlogs: blogsData?.length || 0,
          totalLikes: likes?.length || 0,
        });
      } catch (error) {
        console.error('Error loading profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [username, router]);

  const calculateReadTime = (content: string) => {
    const text = content.replace(/<[^>]*>/g, '');
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.ceil(words / 200);
    return minutes < 1 ? '< 1 min' : `${minutes} min`;
  };

  const getExcerpt = (content: string) => {
    const text = content.replace(/<[^>]*>/g, '');
    return text.substring(0, 150) + (text.length > 150 ? '...' : '');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader size={40} className="text-[#E94560] animate-spin" />
          <p className="text-[#8892A4]">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#8892A4] mb-4">Profile not found</p>
          <Link
            href="/"
            className="inline-block px-6 py-2 bg-[#E94560] text-[#EAEAEA] rounded font-medium hover:bg-[#FF6B6B] transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F]">
      {/* Profile Header */}
      <div className="bg-gradient-to-b from-[#1A1A2E] to-[#0F0F0F] py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 mb-8">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-32 h-32 rounded-full border-4 border-[#E94560] object-cover"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-[#E94560] flex items-center justify-center text-5xl font-bold text-[#EAEAEA] border-4 border-[#E94560]">
                {profile.full_name?.[0] || 'U'}
              </div>
            )}

            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-playfair font-bold text-[#EAEAEA] mb-2">
                {profile.full_name}
              </h1>
              <p className="text-xl text-[#E94560] mb-3">@{profile.username}</p>
              {profile.bio && (
                <p className="text-[#EAEAEA] mb-4">{profile.bio}</p>
              )}
              <div className="flex flex-wrap gap-4">
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[#E94560] hover:text-[#FF6B6B] transition-colors"
                  >
                    <Globe size={16} />
                    Website
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {profile.description && (
            <p className="text-[#8892A4] mb-8">{profile.description}</p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-[#EAEAEA]">
                {stats.totalBlogs}
              </p>
              <p className="text-sm text-[#8892A4]">Published Blogs</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-[#E94560]">
                ❤️ {stats.totalLikes}
              </p>
              <p className="text-sm text-[#8892A4]">Total Likes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Blogs Section */}
      <div className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-playfair font-bold text-[#EAEAEA] mb-8">
            Latest Articles
          </h2>

          {blogs.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-[#8892A4]">
                This author hasn't published any blogs yet.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {blogs.map((blog) => (
                <Link
                  key={blog.id}
                  href={`/blog/${blog.id}`}
                  className="card p-6 hover:shadow-lg transition-all duration-300 group flex gap-6"
                >
                  {blog.cover_image_url && (
                    <div className="hidden sm:block w-32 h-32 flex-shrink-0 overflow-hidden rounded">
                      <img
                        src={blog.cover_image_url}
                        alt={blog.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  )}

                  <div className="flex-1">
                    <h3 className="text-2xl font-playfair font-bold text-[#EAEAEA] group-hover:text-[#E94560] transition-colors mb-2">
                      {blog.title}
                    </h3>

                    <p className="text-[#8892A4] mb-4">
                      {getExcerpt(blog.content)}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-[#8892A4]">
                      <span>{calculateReadTime(blog.content)}</span>
                      <span>👁 {blog.view_count || 0}</span>
                      <span>
                        {new Date(blog.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
