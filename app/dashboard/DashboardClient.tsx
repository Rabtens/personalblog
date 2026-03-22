'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Loader, Edit, Trash2, Eye, PenTool, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
  id: string;
}

interface Blog {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'published';
  cover_image_url: string | null;
  view_count: number;
  created_at: string;
}

interface CommentCount {
  count: number;
}

interface Stats {
  totalViews: number;
  totalLikes: number;
  totalBlogs: number;
  totalComments: number;
}

export default function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'drafts' | 'published'>('drafts');
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalViews: 0,
    totalLikes: 0,
    totalBlogs: 0,
    totalComments: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const authCheckRef = useRef(false);
  const authInProgressRef = useRef(false);

  const loadDashboardData = useCallback(async (userId: string) => {
    try {
      // Load blogs - fetch all blogs for this user (including drafts)
      const { data: blogsData, error: blogsError } = await supabase
        .from('blogs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (blogsError) {
        console.error('Blogs fetch error:', blogsError);
        throw blogsError;
      }

      setBlogs(blogsData as Blog[]);

      // Calculate stats from blogs data only (avoid extra queries)
      const totalViews = blogsData?.reduce((acc, blog) => acc + (blog.view_count || 0), 0) || 0;

      setStats({
        totalViews,
        totalLikes: 0,
        totalBlogs: blogsData?.length || 0,
        totalComments: 0,
      });
    } catch (error) {
      // Silent fail - don't interrupt user experience
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Prevent race conditions with a ref flag
    if (authInProgressRef.current || authCheckRef.current) {
      return;
    }

    const checkAuth = async () => {
      try {
        authInProgressRef.current = true;

        // Use getSession first (faster) instead of getUser
        const {
          data: { session },
        } = await supabase.auth.getSession();

        authInProgressRef.current = false;

        if (!session?.user) {
          router.push('/auth/signin');
          return;
        }

        authCheckRef.current = true;
        setUser(session.user as User);
        await loadDashboardData(session.user.id);
      } catch (error: any) {
        // Ignore lock-stealing errors, they're not critical
        if (error?.message?.includes('Lock') || error?.message?.includes('token')) {
          console.warn('Auth lock recovered automatically');
          return;
        }
        console.error('Auth error:', error);
        authInProgressRef.current = false;
      }
    };

    checkAuth();

    // Cleanup
    return () => {
      authInProgressRef.current = false;
    };
  }, [router, loadDashboardData]);

  // Refresh when coming back from write page
  useEffect(() => {
    const refresh = searchParams.get('refresh');
    if (refresh === 'true' && user) {
      loadDashboardData(user.id).then(() => {
        // Clear the query param
        router.replace('/dashboard');
      });
    }
  }, [searchParams, user, loadDashboardData, router]);

  // Only refresh on explicit user action (manual refresh button)
  // Removed auto-refresh to prevent lag and glitches

  const handleManualRefresh = async () => {
    if (!user) return;
    setIsRefreshing(true);
    await loadDashboardData(user.id);
  };

  const handleDeleteBlog = async (blogId: string) => {
    if (!confirm('Are you sure you want to delete this blog? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('blogs')
        .delete()
        .eq('id', blogId);

      if (error) throw error;

      setBlogs((prev) => prev.filter((b) => b.id !== blogId));
      toast.success('Blog deleted successfully');
    } catch (error) {
      toast.error('Failed to delete blog');
    }
  };

  const handlePublishUnpublish = async (
    blogId: string,
    newStatus: 'draft' | 'published'
  ) => {
    try {
      const { error } = await supabase
        .from('blogs')
        .update({ status: newStatus })
        .eq('id', blogId);

      if (error) throw error;

      setBlogs((prev) =>
        prev.map((b) =>
          b.id === blogId ? { ...b, status: newStatus } : b
        )
      );

      toast.success(
        newStatus === 'published'
          ? 'Blog published!'
          : 'Blog moved to drafts'
      );
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update blog status');
    }
  };

  const filteredBlogs = blogs.filter((b) => b.status === activeTab);

  const getExcerpt = (content: string) => {
    const text = content.replace(/<[^>]*>/g, '');
    return text.substring(0, 150) + (text.length > 150 ? '...' : '');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader size={40} className="text-[#E94560] animate-spin" />
          <p className="text-[#8892A4]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-playfair font-bold text-[#EAEAEA] mb-2">
              Your Dashboard
            </h1>
            <p className="text-[#8892A4]">Manage your blogs and track your performance</p>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 border border-[#2A2A4A] text-[#8892A4] rounded hover:text-[#EAEAEA] hover:border-[#E94560] transition-colors flex items-center gap-2 disabled:opacity-50"
            title="Refresh dashboard"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          <div className="card p-6">
            <p className="text-[#8892A4] text-sm mb-2">Total Views</p>
            <p className="text-3xl font-bold text-[#EAEAEA]">{stats.totalViews}</p>
          </div>
          <div className="card p-6">
            <p className="text-[#8892A4] text-sm mb-2">Total Likes</p>
            <p className="text-3xl font-bold text-[#E94560]">❤️ {stats.totalLikes}</p>
          </div>
          <div className="card p-6">
            <p className="text-[#8892A4] text-sm mb-2">Total Blogs</p>
            <p className="text-3xl font-bold text-[#EAEAEA]">{stats.totalBlogs}</p>
          </div>
          <div className="card p-6">
            <p className="text-[#8892A4] text-sm mb-2">Total Comments</p>
            <p className="text-3xl font-bold text-[#EAEAEA]">💬 {stats.totalComments}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-[#2A2A4A]">
          <button
            onClick={() => setActiveTab('drafts')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'drafts'
                ? 'border-[#E94560] text-[#E94560]'
                : 'border-transparent text-[#8892A4] hover:text-[#EAEAEA]'
            }`}
          >
            My Drafts ({blogs.filter((b) => b.status === 'draft').length})
          </button>
          <button
            onClick={() => setActiveTab('published')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'published'
                ? 'border-[#E94560] text-[#E94560]'
                : 'border-transparent text-[#8892A4] hover:text-[#EAEAEA]'
            }`}
          >
            Published ({blogs.filter((b) => b.status === 'published').length})
          </button>
        </div>

        {/* Blogs Grid */}
        {filteredBlogs.length === 0 ? (
          <div className="text-center py-12">
            <PenTool size={48} className="mx-auto text-[#2A2A4A] mb-4" />
            <p className="text-[#8892A4] mb-4">
              {activeTab === 'drafts'
                ? "You haven't created any drafts yet"
                : "You haven't published any blogs yet"}
            </p>
            <Link
              href="/write"
              className="inline-block px-6 py-2 bg-[#E94560] text-[#EAEAEA] rounded font-medium hover:bg-[#FF6B6B] transition-colors"
            >
              Start Writing
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBlogs.map((blog) => (
              <div
                key={blog.id}
                className="card hover:shadow-2xl transition-all duration-300 flex flex-col"
              >
                {/* Cover Image */}
                {blog.cover_image_url && (
                  <img
                    src={blog.cover_image_url}
                    alt={blog.title}
                    className="w-full h-40 object-cover"
                  />
                )}

                {/* Content */}
                <div className="flex-1 p-4 flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-playfair font-bold text-[#EAEAEA] flex-1">
                      {blog.title}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs rounded font-medium whitespace-nowrap ml-2 ${
                        blog.status === 'published'
                          ? 'bg-[#E94560]/20 text-[#E94560]'
                          : 'bg-[#2A2A4A] text-[#8892A4]'
                      }`}
                    >
                      {blog.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </div>

                  <p className="text-[#8892A4] text-sm mb-4 flex-1">
                    {getExcerpt(blog.content)}
                  </p>

                  {/* Stats */}
                  <div className="flex gap-4 text-sm text-[#8892A4] mb-4 pb-4 border-t border-[#2A2A4A] pt-4">
                    <span>👁 {blog.view_count || 0}</span>
                    <span>📅 {new Date(blog.created_at).toLocaleDateString()}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/blog/${blog.id}`}
                      className="flex-1 px-3 py-2 border border-[#2A2A4A] text-[#EAEAEA] rounded text-sm hover:bg-[#1A1A2E] transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye size={16} />
                      View
                    </Link>
                    <Link
                      href={`/write/${blog.id}`}
                      className="flex-1 px-3 py-2 border border-[#2A2A4A] text-[#EAEAEA] rounded text-sm hover:bg-[#1A1A2E] transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit size={16} />
                      Edit
                    </Link>
                    <button
                      onClick={() =>
                        handlePublishUnpublish(
                          blog.id,
                          blog.status === 'draft' ? 'published' : 'draft'
                        )
                      }
                      className="flex-1 px-3 py-2 border border-[#E94560] text-[#E94560] rounded text-sm hover:bg-[#E94560] hover:text-[#EAEAEA] transition-colors"
                    >
                      {blog.status === 'draft' ? 'Publish' : 'Unpublish'}
                    </button>
                    <button
                      onClick={() => handleDeleteBlog(blog.id)}
                      className="px-3 py-2 border border-[#FF6B6B] text-[#FF6B6B] rounded hover:bg-[#FF6B6B] hover:text-[#0F0F0F] transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
