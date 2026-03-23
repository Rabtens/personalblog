'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  Heart,
  Share2,
  Loader,
  MessageCircle,
  Trash2,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface BlogData {
  id: string;
  title: string;
  content: string;
  cover_image_url: string | null;
  view_count: number;
  created_at: string;
  user_id: string;
  status: 'draft' | 'published';
  profiles: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface User {
  id: string;
  email: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface Like {
  id: string;
  user_id: string;
}

export default function BlogPage() {
  const params = useParams();
  const router = useRouter();
  const blogId = params.id as string;

  const [blog, setBlog] = useState<BlogData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isLoadingBlog, setIsLoadingBlog] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLikingBlog, setIsLikingBlog] = useState(false);

  useEffect(() => {
    const loadPage = async () => {
      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user as User | null);

        // Load blog
        const { data: blogData, error: blogError } = await supabase
          .from('blogs')
          .select(
            `
            *,
            profiles:user_id(id, username, full_name, avatar_url)
          `
          )
          .eq('id', blogId)
          .single();

        if (blogError) throw blogError;

        const typedBlog = blogData as BlogData;

        // Check if published or owned by user
        if (
          typedBlog.status === 'published' ||
          (user && typedBlog.user_id === user.id)
        ) {
          setBlog(typedBlog);

          // Increment view count
          if (typedBlog.status === 'published') {
            await supabase
              .from('blogs')
              .update({ view_count: (typedBlog.view_count || 0) + 1 })
              .eq('id', blogId);
          }
        } else {
          router.push('/');
          return;
        }

        // Load comments
        const { data: commentsData } = await supabase
          .from('comments')
          .select(
            `
            *,
            profiles:user_id(id, username, full_name, avatar_url)
          `
          )
          .eq('blog_id', blogId)
          .order('created_at', { ascending: false });

        setComments((commentsData || []) as Comment[]);

        // Load likes
        const { data: likesData } = await supabase
          .from('likes')
          .select('*')
          .eq('blog_id', blogId);

        const typedLikes = (likesData || []) as Like[];
        setLikes(typedLikes);
        setLikeCount(typedLikes.length);

        if (user) {
          setIsLiked(
            typedLikes.some((like) => like.user_id === user.id)
          );
        }
      } catch (error) {
        console.error('Error loading blog:', error);
        toast.error('Failed to load blog');
        router.push('/');
      } finally {
        setIsLoadingBlog(false);
      }
    };

    loadPage();
  }, [blogId, router]);

  const handleLike = async () => {
    if (!user) {
      toast.error('Please sign in to like');
      router.push('/auth/signin');
      return;
    }

    setIsLikingBlog(true);

    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('blog_id', blogId)
          .eq('user_id', user.id);

        if (error) throw error;

        setIsLiked(false);
        setLikeCount((prev) => prev - 1);
      } else {
        // Like
        const { error } = await supabase
          .from('likes')
          .insert({
            blog_id: blogId,
            user_id: user.id,
          });

        if (error) throw error;

        setIsLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Like error:', error);
      toast.error('Failed to update like');
    } finally {
      setIsLikingBlog(false);
    }
  };

  const handleAddComment = async () => {
    if (!user) {
      toast.error('Please sign in to comment');
      router.push('/auth/signin');
      return;
    }

    if (!commentText.trim()) {
      toast.error('Please write a comment');
      return;
    }

    setIsSubmittingComment(true);

    try {
      const { data: newComment, error } = await supabase
        .from('comments')
        .insert({
          blog_id: blogId,
          user_id: user.id,
          content: commentText,
        })
        .select(
          `
          *,
          profiles:user_id(id, username, full_name, avatar_url)
        `
        )
        .single();

      if (error) throw error;

      setComments([newComment as Comment, ...comments]);
      setCommentText('');
      toast.success('Comment added!');
    } catch (error) {
      console.error('Comment error:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (
      !confirm('Are you sure you want to delete this comment?')
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      setComments((prev) =>
        prev.filter((c) => c.id !== commentId)
      );
      toast.success('Comment deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete comment');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const calculateReadTime = () => {
    if (!blog) return '0 min';
    const text = blog.content.replace(/<[^>]*>/g, '');
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.ceil(words / 200);
    return minutes < 1 ? '< 1 min' : `${minutes} min`;
  };

  if (isLoadingBlog) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader size={40} className="text-[#E94560] animate-spin" />
          <p className="text-[#8892A4]">Loading blog...</p>
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#8892A4] mb-4">Blog not found</p>
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
      {/* Cover Image */}
      {blog.cover_image_url && (
        <div className="relative w-full h-96 md:h-[500px] overflow-hidden">
          <img
            src={blog.cover_image_url}
            alt={blog.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] to-transparent" />
        </div>
      )}

      {/* Main Content */}
      <article className="max-w-3xl mx-auto px-4 py-12">
        {/* Title */}
        <h1 className="text-5xl md:text-6xl font-playfair font-bold text-[#EAEAEA] mb-6 leading-tight">
          {blog.title}
        </h1>

        {/* Author & Meta */}
        <div className="flex items-center gap-4 pb-8 border-b border-[#2A2A4A] mb-8">
          <Link
            href={`/profile/${blog.profiles.username}`}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            {blog.profiles.avatar_url ? (
              <img
                src={blog.profiles.avatar_url}
                alt={blog.profiles.full_name}
                className="w-12 h-12 rounded-full border border-[#2A2A4A]"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#E94560] flex items-center justify-center font-bold">
                {blog.profiles.full_name?.[0] || 'U'}
              </div>
            )}
            <div>
              <p className="font-medium text-[#EAEAEA]">
                {blog.profiles.full_name}
              </p>
              <p className="text-sm text-[#8892A4]">
                @{blog.profiles.username}
              </p>
            </div>
          </Link>

          <div className="ml-auto text-right text-sm text-[#8892A4]">
            <p>{new Date(blog.created_at).toLocaleDateString()}</p>
            <p>{calculateReadTime()} read</p>
          </div>
        </div>

        {/* Content */}
        <div
          className="blog-display prose prose-invert max-w-none mb-12 text-[#EAEAEA]"
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />

        {/* Actions */}
        <div className="flex gap-4 py-8 border-t border-[#2A2A4A] border-b mb-12">
          <button
            onClick={handleLike}
            disabled={isLikingBlog}
            className="flex items-center gap-2 px-4 py-2 border border-[#2A2A4A] text-[#EAEAEA] rounded hover:bg-[#1A1A2E] disabled:opacity-50 transition-colors"
          >
            <Heart
              size={20}
              className={isLiked ? 'fill-[#E94560] text-[#E94560]' : ''}
            />
            {likeCount}
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 border border-[#2A2A4A] text-[#EAEAEA] rounded hover:bg-[#1A1A2E] transition-colors"
          >
            <Share2 size={20} />
            Share
          </button>
        </div>

        {/* Comments Section */}
        <div className="space-y-8">
          <h2 className="text-2xl font-playfair font-bold text-[#EAEAEA]">
            Comments ({comments.length})
          </h2>

          {/* Add Comment Form */}
          {user ? (
            <div className="card p-6">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Share your thoughts..."
                className="w-full h-24 bg-[#0F0F0F] text-[#EAEAEA] border border-[#2A2A4A] rounded p-3 focus:border-[#E94560] focus:ring-2 focus:ring-[#E94560]/20 transition-all resize-none"
              />
              <button
                onClick={handleAddComment}
                disabled={isSubmittingComment || !commentText.trim()}
                className="mt-4 px-6 py-2 bg-[#E94560] text-[#EAEAEA] rounded font-medium hover:bg-[#FF6B6B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSubmittingComment ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Posting...
                  </>
                ) : (
                  'Post Comment'
                )}
              </button>
            </div>
          ) : (
            <div className="card p-6 text-center">
              <p className="text-[#8892A4] mb-4">
                Sign in to comment on this blog
              </p>
              <Link
                href="/auth/signin"
                className="inline-block px-6 py-2 bg-[#E94560] text-[#EAEAEA] rounded font-medium hover:bg-[#FF6B6B] transition-colors"
              >
                Sign In
              </Link>
            </div>
          )}

          {/* Comments List */}
          {comments.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle size={40} className="mx-auto text-[#2A2A4A] mb-4" />
              <p className="text-[#8892A4]">
                No comments yet. Be the first to share your thoughts!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="card p-4"
                >
                  <div className="flex gap-3">
                    {comment.profiles.avatar_url ? (
                      <img
                        src={comment.profiles.avatar_url}
                        alt={comment.profiles.full_name}
                        className="w-10 h-10 rounded-full border border-[#2A2A4A]"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#E94560] flex items-center justify-center font-bold text-xs">
                        {comment.profiles.full_name?.[0] || 'U'}
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-[#EAEAEA]">
                            {comment.profiles.full_name}
                          </p>
                          <p className="text-xs text-[#8892A4]">
                            @{comment.profiles.username} •{' '}
                            {new Date(
                              comment.created_at
                            ).toLocaleDateString()}
                          </p>
                        </div>

                        {user &&
                          user.id === comment.user_id && (
                          <button
                            onClick={() =>
                              handleDeleteComment(comment.id)
                            }
                            className="p-1 hover:bg-[#242442] rounded transition-colors"
                          >
                            <Trash2
                              size={16}
                              className="text-[#FF6B6B]"
                            />
                          </button>
                        )}
                      </div>

                      <p className="mt-2 text-[#EAEAEA]">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
