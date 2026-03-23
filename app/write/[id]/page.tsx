'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Editor from '@/components/Editor';
import toast from 'react-hot-toast';
import { Upload, Loader, Eye, Trash2 } from 'lucide-react';

interface User {
  id: string;
}

interface Blog {
  id: string;
  user_id: string;
  title: string;
  content: string;
  cover_image_url: string | null;
  status: 'draft' | 'published';
}

export default function EditBlogPage() {
  const params = useParams();
  const router = useRouter();
  const blogId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [blog, setBlog] = useState<Blog | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState('');
  const [isLoadingBlog, setIsLoadingBlog] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const authCheckRef = useRef(false);
  const authInProgressRef = useRef(false);

  useEffect(() => {
    // Prevent race conditions
    if (authInProgressRef.current || authCheckRef.current) {
      return;
    }

    const loadBlog = async () => {
      try {
        authInProgressRef.current = true;

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

        // Load blog
        const { data: blogData, error } = await supabase
          .from('blogs')
          .select('*')
          .eq('id', blogId)
          .single();

        if (error) throw error;

        const typedBlog = blogData as Blog;

        // Check ownership
        if (typedBlog.user_id !== session.user.id) {
          toast.error('You do not have permission to edit this blog');
          router.push('/dashboard');
          return;
        }

        setBlog(typedBlog);
        setTitle(typedBlog.title);
        setContent(typedBlog.content);
        if (typedBlog.cover_image_url) {
          setCoverImagePreview(typedBlog.cover_image_url);
        }
      } catch (error: any) {
        // Ignore lock-stealing errors
        if (error?.message?.includes('Lock') || error?.message?.includes('token')) {
          console.warn('Auth lock recovered');
          return;
        }
        console.error('Error loading blog:', error);
        toast.error('Failed to load blog');
        router.push('/dashboard');
      } finally {
        setIsLoadingBlog(false);
      }
    };

    loadBlog();

    // Cleanup
    return () => {
      authInProgressRef.current = false;
    };
  }, [blogId, router]);

  useEffect(() => {
    // Calculate word count
    const text = content.replace(/<[^>]*>/g, '');
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  }, [content]);

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadCoverImage = async (): Promise<string | null> => {
    if (!coverImage) return null;

    try {
      const filename = `${Date.now()}-${coverImage.name}`;
      const { data, error } = await supabase.storage
        .from('blog-covers')
        .upload(filename, coverImage);

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from('blog-covers').getPublicUrl(filename);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading cover image:', error);
      toast.error('Failed to upload cover image');
      return null;
    }
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      toast.error('Please add a title');
      return;
    }

    if (!content.trim()) {
      toast.error('Please write some content');
      return;
    }

    if (!blog) return;

    setIsSaving(true);

    try {
      let coverUrl = blog.cover_image_url;

      if (coverImage) {
        const newUrl = await uploadCoverImage();
        if (newUrl) {
          coverUrl = newUrl;
        }
      }

      const { error } = await supabase
        .from('blogs')
        .update({
          title,
          content,
          cover_image_url: coverUrl,
          status: 'draft',
          updated_at: new Date().toISOString(),
        })
        .eq('id', blog.id);

      if (error) throw error;

      toast.success('Draft updated successfully!');
      setCoverImage(null);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      toast.error('Please add a title');
      return;
    }

    if (!content.trim()) {
      toast.error('Please write some content');
      return;
    }

    if (!blog) return;

    setIsPublishing(true);

    try {
      let coverUrl = blog.cover_image_url;

      if (coverImage) {
        const newUrl = await uploadCoverImage();
        if (newUrl) {
          coverUrl = newUrl;
        }
      }

      const { error } = await supabase
        .from('blogs')
        .update({
          title,
          content,
          cover_image_url: coverUrl,
          status: 'published',
          updated_at: new Date().toISOString(),
        })
        .eq('id', blog.id);

      if (error) throw error;

      // Wait for database to process before redirecting
      const wordCount = content.split(/\s+/).length;
      const processingDelay = Math.min(wordCount > 3000 ? 1500 : 800, 2000);
      await new Promise(resolve => setTimeout(resolve, processingDelay));
      
      toast.success('Blog published successfully!');
      router.push('/dashboard');
    } catch (error) {
      let errorMessage = 'Failed to publish blog';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      console.error('Publish error:', error);
      toast.error(errorMessage);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteBlog = async () => {
    if (
      !confirm(
        'Are you sure you want to delete this blog? This action cannot be undone.'
      )
    ) {
      return;
    }

    if (!blog) return;

    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('blogs')
        .delete()
        .eq('id', blog.id);

      if (error) throw error;

      toast.success('Blog deleted successfully');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete blog');
    } finally {
      setIsDeleting(false);
    }
  };

  const calculateReadTime = () => {
    const wordsPerMinute = 200;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
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
    return null;
  }

  if (showPreview) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => setShowPreview(false)}
            className="mb-6 px-4 py-2 border border-[#2A2A4A] text-[#EAEAEA] rounded hover:bg-[#1A1A2E] transition-colors"
          >
            ← Back to Editor
          </button>

          {coverImagePreview && (
            <img
              src={coverImagePreview}
              alt="Cover"
              className="w-full h-80 object-cover rounded-lg mb-8"
            />
          )}

          <div className="mb-8">
            <h1 className="text-5xl font-playfair font-bold text-[#EAEAEA] mb-4">
              {title || 'Untitled'}
            </h1>
            <p className="text-[#8892A4]">Read time: {calculateReadTime()}</p>
          </div>

          <div
            className="blog-display prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Title Input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Your story title..."
          className="w-full mb-8 text-5xl font-playfair font-bold bg-transparent text-[#EAEAEA] placeholder-[#2A2A4A] border-b border-[#2A2A4A] pb-4 focus:outline-none focus:border-[#E94560] transition-colors"
        />

        {/* Cover Image Upload */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-[#EAEAEA] mb-4">
            Cover Image
          </label>
          <div className="relative">
            {coverImagePreview ? (
              <div className="relative group">
                <img
                  src={coverImagePreview}
                  alt="Cover preview"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <button
                  onClick={() => {
                    setCoverImage(null);
                    setCoverImagePreview('');
                  }}
                  className="absolute top-2 right-2 px-3 py-1 bg-[#E94560] text-[#EAEAEA] rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-[#2A2A4A] rounded-lg p-8 text-center cursor-pointer hover:border-[#E94560] transition-colors">
                <Upload className="mx-auto mb-2 text-[#8892A4]" size={32} />
                <p className="text-[#EAEAEA] font-medium">
                  Drag and drop your cover image
                </p>
                <p className="text-[#8892A4] text-sm">
                  or click to browse (PNG, JPG, GIF up to 10MB)
                </p>
                <input
                  type="file"
                  onChange={handleCoverImageChange}
                  accept="image/*"
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-[#EAEAEA] mb-4">
            Content
          </label>
          <Editor initialContent={content} onChange={setContent} />
        </div>

        {/* Stats */}
        <div className="flex justify-between items-center mb-8 p-4 bg-[#1A1A2E] rounded border border-[#2A2A4A]">
          <div className="flex gap-8">
            <div>
              <p className="text-[#8892A4] text-sm">Words</p>
              <p className="text-[#EAEAEA] font-medium">{wordCount}</p>
            </div>
            <div>
              <p className="text-[#8892A4] text-sm">Read Time</p>
              <p className="text-[#EAEAEA] font-medium">{calculateReadTime()}</p>
            </div>
            <div>
              <p className="text-[#8892A4] text-sm">Status</p>
              <p className="text-[#E94560] font-medium capitalize">
                {blog.status}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 sticky bottom-4 flex-wrap">
          <button
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="px-6 py-2 border border-[#2A2A4A] text-[#EAEAEA] rounded font-medium hover:bg-[#1A1A2E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSaving && <Loader size={18} className="animate-spin" />}
            Save Draft
          </button>

          <button
            onClick={() => setShowPreview(true)}
            disabled={!title.trim() || !content.trim()}
            className="px-6 py-2 border border-[#2A2A4A] text-[#EAEAEA] rounded font-medium hover:bg-[#1A1A2E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Eye size={18} />
            Preview
          </button>

          <button
            onClick={handlePublish}
            disabled={isPublishing || !title.trim() || !content.trim()}
            className="px-6 py-2 bg-[#E94560] text-[#EAEAEA] rounded font-medium hover:bg-[#FF6B6B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isPublishing && <Loader size={18} className="animate-spin" />}
            {blog.status === 'published' ? 'Update' : 'Publish'}
          </button>

          <button
            onClick={handleDeleteBlog}
            disabled={isDeleting}
            className="px-6 py-2 border border-[#FF6B6B] text-[#FF6B6B] rounded font-medium hover:bg-[#FF6B6B] hover:text-[#0F0F0F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 ml-auto"
          >
            {isDeleting && <Loader size={18} className="animate-spin" />}
            <Trash2 size={18} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
