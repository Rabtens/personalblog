'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowRight, Loader } from 'lucide-react';

interface Blog {
  id: string;
  title: string;
  content: string;
  cover_image_url: string | null;
  created_at: string;
  view_count: number;
  profiles: {
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface User {
  id: string;
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const authCheckRef = useRef(false);
  const authInProgressRef = useRef(false);

  useEffect(() => {
    // Prevent race conditions
    if (authInProgressRef.current || authCheckRef.current) {
      return;
    }

    const loadPage = async () => {
      try {
        authInProgressRef.current = true;

        // Check auth
        const {
          data: { session },
        } = await supabase.auth.getSession();

        authInProgressRef.current = false;
        authCheckRef.current = true;

        setUser(session?.user as User | null);

        // Load featured published blogs
        const { data: blogsData } = await supabase
          .from('blogs')
          .select(
            `
            *,
            profiles:user_id(username, full_name, avatar_url)
          `
          )
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(6);

        setBlogs((blogsData || []) as Blog[]);
      } catch (error: any) {
        // Ignore lock-stealing errors
        if (error?.message?.includes('Lock') || error?.message?.includes('token')) {
          console.warn('Auth lock recovered');
          return;
        }
        console.error('Error loading page:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPage();

    // Cleanup
    return () => {
      authInProgressRef.current = false;
    };
  }, []);

  const calculateReadTime = (content: string) => {
    const text = content.replace(/<[^>]*>/g, '');
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.ceil(words / 200);
    return minutes < 1 ? '< 1 min' : `${minutes} min`;
  };

  const getExcerpt = (content: string) => {
    const text = content.replace(/<[^>]*>/g, '');
    return text.substring(0, 120) + (text.length > 120 ? '...' : '');
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F]">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-20 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#E94560] rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-72 h-72 bg-[#E94560] rounded-full blur-3xl opacity-20"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-playfair font-bold text-[#EAEAEA] leading-tight">
              Blogs{' '}
              <span className="gradient-text">Worth Reading</span>
            </h1>
            <p className="text-xl md:text-2xl text-[#8892A4] max-w-2xl mx-auto">
              Kuzuzangpo La and welcome to a Blog sharing platform where writers and creators can share their
              thoughts, stories, and ideas with a beautiful, distraction-free
              reading experience through blogs.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link
              href={user ? '/write' : '/auth/signin'}
              className="px-8 py-4 bg-[#E94560] text-[#EAEAEA] rounded-lg font-semibold hover:bg-[#FF6B6B] transition-colors flex items-center justify-center gap-2 group"
            >
              {user ? '✏️ Start Writing' : 'Get Started'}
              <ArrowRight
                size={20}
                className="group-hover:translate-x-1 transition-transform"
              />
            </Link>
            <Link
              href="#featured"
              className="px-8 py-4 border-2 border-[#E94560] text-[#E94560] rounded-lg font-semibold hover:bg-[#E94560] hover:text-[#EAEAEA] transition-colors"
            >
              Explore Blog
            </Link>
          </div>

          {/* Stats */}
          <div className="pt-12 flex justify-center gap-12 text-center">
            <div>
              <p className="text-3xl font-bold text-[#EAEAEA]">
                {blogs.length}+
              </p>
              <p className="text-[#8892A4]">Stories Published</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Blogs Section */}
      <section id="featured" className="py-20 px-4 bg-[#0F0F0F]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-playfair font-bold text-[#EAEAEA] mb-4">
              Featured Stories
            </h2>
            <p className="text-lg text-[#8892A4]">
              Discover the latest and most popular blogs from our platform.
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader
                  size={40}
                  className="text-[#E94560] animate-spin"
                />
                <p className="text-[#8892A4]">Loading stories...</p>
              </div>
            </div>
          ) : blogs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#8892A4] mb-6">
                No blogs published yet. Be the first to share your blog!
              </p>
              <Link
                href={user ? '/write' : '/auth/signin'}
                className="inline-block px-6 py-2 bg-[#E94560] text-[#EAEAEA] rounded font-medium hover:bg-[#FF6B6B] transition-colors"
              >
                {user ? 'Start Writing' : 'Sign In to Write'}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogs.map((blog) => (
                <Link
                  key={blog.id}
                  href={`/blog/${blog.id}`}
                  className="card group overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col h-full"
                >
                  {/* Cover Image */}
                  {blog.cover_image_url && (
                    <div className="relative h-48 overflow-hidden bg-[#1A1A2E]">
                      <img
                        src={blog.cover_image_url}
                        alt={blog.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 p-6 flex flex-col">
                    <h3 className="text-xl font-playfair font-bold text-[#EAEAEA] mb-2 group-hover:text-[#E94560] transition-colors line-clamp-2">
                      {blog.title}
                    </h3>

                    <p className="text-[#8892A4] text-sm mb-4 flex-1">
                      {getExcerpt(blog.content)}
                    </p>

                    {/* Author Info */}
                    <div className="flex items-center gap-3 mb-4 pb-4 border-t border-[#2A2A4A] pt-4">
                      {blog.profiles.avatar_url ? (
                        <img
                          src={blog.profiles.avatar_url}
                          alt={blog.profiles.full_name}
                          className="w-8 h-8 rounded-full border border-[#2A2A4A]"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#E94560] flex items-center justify-center text-xs font-bold">
                          {blog.profiles.full_name?.[0] || 'U'}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-[#EAEAEA]">
                          {blog.profiles.full_name}
                        </p>
                        <p className="text-xs text-[#8892A4]">
                          @{blog.profiles.username}
                        </p>
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center justify-between text-xs text-[#8892A4]">
                      <span>
                        {calculateReadTime(blog.content)}
                      </span>
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

          {blogs.length > 0 && (
            <div className="text-center mt-12">
              <Link
                href="/#featured"
                className="inline-block px-6 py-2 border border-[#E94560] text-[#E94560] rounded hover:bg-[#E94560] hover:text-[#EAEAEA] transition-colors"
              >
                See more blogs
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-[#0F0F0F] to-[#1A1A2E]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-playfair font-bold text-[#EAEAEA] mb-6">
            Ready to share your story?
          </h2>
          <p className="text-lg text-[#8892A4] mb-8">
            Join our platform with other writers and start publishing your thoughts
            today.
          </p>
          <Link
            href={user ? '/write' : '/auth/signup'}
            className="inline-block px-8 py-4 bg-[#E94560] text-[#EAEAEA] rounded-lg font-semibold hover:bg-[#FF6B6B] transition-colors"
          >
            {user ? 'Start Writing Now' : 'Create Free Account'}
          </Link>
        </div>
      </section>
    </div>
  );
}
