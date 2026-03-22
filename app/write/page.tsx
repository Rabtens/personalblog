'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef, Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Upload, Loader, Eye } from 'lucide-react';

// Lazy load the heavy Editor component
const Editor = lazy(() => import('@/components/Editor'));

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    username?: string;
    [key: string]: any;
  };
}

export default function WritePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [blogId, setBlogId] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoSavedRef = useRef(false);
  const authCheckRef = useRef(false);
  const authInProgressRef = useRef(false);

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
  }, [router]);

  useEffect(() => {
    // Calculate word count
    const text = content.replace(/<[^>]*>/g, '');
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  }, [content]);

  useEffect(() => {
    // Auto-save every 60 seconds
    autoSaveTimeoutRef.current = setTimeout(() => {
      if (title && content && user) {
        handleAutoSave();
      }
    }, 60000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [title, content, user]);

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
        .upload(filename, coverImage, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        console.error('Storage error:', error);
        throw new Error(`Storage error: ${error.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('blog-covers')
        .getPublicUrl(filename);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to generate public URL');
      }

      return urlData.publicUrl;
    } catch (error: any) {
      console.error('Error uploading cover image:', error);
      throw error;
    }
  };

  const handleAutoSave = async () => {
    if (!user) return;

    try {
      setIsSaving(true);

      const { data, error } = await supabase
        .from('blogs')
        .insert({
          user_id: user.id,
          title,
          content,
          status: 'draft',
        })
        .select()
        .single();

      if (!error && !hasAutoSavedRef.current) {
        hasAutoSavedRef.current = true;
        toast.success('Draft auto-saved');
      }
    } catch (error) {
      console.error('Auto-save error:', error);
    } finally {
      setIsSaving(false);
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

    if (!user) {
      toast.error('You must be signed in to save a draft');
      return;
    }

    setIsSaving(true);

    try {
      // Verify user profile exists
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData) {
        // Profile doesn't exist, create it
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || '',
            username: user.user_metadata?.username || user.email?.split('@')[0] || 'user',
          });

        if (createProfileError) {
          throw new Error(`Failed to create profile: ${createProfileError.message}`);
        }
      }

      if (blogId) {
        // Update existing draft
        const { error } = await supabase
          .from('blogs')
          .update({
            title,
            content,
            status: 'draft',
            updated_at: new Date().toISOString(),
          })
          .eq('id', blogId)
          .eq('user_id', user.id);

        if (error) throw error;
        setLastSavedTime(new Date());
        toast.success('Draft updated successfully!');
        router.push('/dashboard?refresh=true');
      } else {
        // Create new draft
        const { data, error } = await supabase
          .from('blogs')
          .insert({
            user_id: user.id,
            title,
            content,
            status: 'draft',
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setBlogId(data.id);
          console.log('Draft created with ID:', data.id);
          console.log('Redirecting to dashboard with refresh flag');
        }
        setLastSavedTime(new Date());
        toast.success('Draft saved successfully!');
        router.push('/dashboard?refresh=true');
      }
    } catch (error: any) {
      console.error('Save error full:', JSON.stringify(error));
      
      let errorMessage = 'Failed to save draft';
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error_description) {
        errorMessage = error.error_description;
      } else if (error?.details) {
        errorMessage = error.details;
      }
      
      toast.error(errorMessage);
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

    if (!user) {
      toast.error('You must be signed in to publish');
      return;
    }

    setIsPublishing(true);

    try {
      // Verify user profile exists
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData) {
        // Profile doesn't exist, create it
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || '',
            username: user.user_metadata?.username || user.email?.split('@')[0] || 'user',
          });

        if (createProfileError) {
          throw new Error(`Failed to create profile: ${createProfileError.message}`);
        }
      }

      let coverUrl = null;

      if (coverImage) {
        coverUrl = await uploadCoverImage();
        if (!coverUrl) {
          toast.error('Failed to upload cover image. Please try again.');
          setIsPublishing(false);
          return;
        }
      }

      if (blogId) {
        // Update existing draft to published
        const { error } = await supabase
          .from('blogs')
          .update({
            title,
            content,
            cover_image_url: coverUrl || undefined,
            status: 'published',
            updated_at: new Date().toISOString(),
          })
          .eq('id', blogId)
          .eq('user_id', user.id);

        if (error) throw error;
        setLastSavedTime(new Date());
        toast.success('Blog published successfully!');
        
        // Redirect immediately to dashboard
        router.push('/dashboard?refresh=true');
      } else {
        // Create and publish new blog
        const { data, error } = await supabase
          .from('blogs')
          .insert({
            user_id: user.id,
            title,
            content,
            cover_image_url: coverUrl,
            status: 'published',
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setBlogId(data.id);
          console.log('Blog published with ID:', data.id);
        }
        setLastSavedTime(new Date());
        toast.success('Blog published successfully!');
        
        // Redirect immediately to dashboard
        router.push('/dashboard?refresh=true');
      }
    } catch (error: any) {
      console.error('Publish error full:', JSON.stringify(error));
      
      let errorMessage = 'Failed to publish blog';
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error_description) {
        errorMessage = error.error_description;
      } else if (error?.details) {
        errorMessage = error.details;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsPublishing(false);
    }
  };

  const calculateReadTime = () => {
    const wordsPerMinute = 200;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return minutes < 1 ? '< 1 min' : `${minutes} min`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader size={40} className="text-[#E94560] animate-spin" />
          <p className="text-[#8892A4]">Loading...</p>
        </div>
      </div>
    );
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
            className="prose prose-invert max-w-none"
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
          </div>
          <div className="flex items-center gap-2">
            {lastSavedTime && (
              <span className="text-xs text-[#4CAF50] font-medium flex items-center gap-1">
                ✓ {blogId ? 'Saved' : 'New Draft'}
              </span>
            )}
            {isSaving && <p className="text-xs text-[#8892A4]">Saving...</p>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 sticky bottom-4">
          <button
            onClick={handleSaveDraft}
            disabled={isSaving || !title.trim()}
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
            className="px-6 py-2 bg-[#E94560] text-[#EAEAEA] rounded font-medium hover:bg-[#FF6B6B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 ml-auto"
          >
            {isPublishing && <Loader size={18} className="animate-spin" />}
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}
