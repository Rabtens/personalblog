'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Upload, Loader, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
}

interface Profile {
  id: string;
  full_name: string;
  username: string;
  email: string;
  bio: string | null;
  description: string | null;
  website: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface Stats {
  totalBlogs: number;
  totalLikes: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalBlogs: 0,
    totalLikes: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const authCheckRef = useRef(false);
  const authInProgressRef = useRef(false);

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    bio: '',
    description: '',
    website: '',
  });

  useEffect(() => {
    // Prevent race conditions with a ref flag
    if (authInProgressRef.current || authCheckRef.current) {
      return;
    }

    const loadProfile = async () => {
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

        // Load profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileData) {
          setProfile(profileData as Profile);
          setFormData({
            fullName: profileData.full_name || '',
            username: profileData.username || '',
            bio: profileData.bio || '',
            description: profileData.description || '',
            website: profileData.website || '',
          });
          if (profileData.avatar_url) {
            setAvatarPreview(profileData.avatar_url);
          }

          // Load stats
          const { data: blogs } = await supabase
            .from('blogs')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('status', 'published');

          const { data: likes } = await supabase
            .from('likes')
            .select('id')
            .in(
              'blog_id',
              blogs?.map((b) => b.id) || []
            );

          setStats({
            totalBlogs: blogs?.length || 0,
            totalLikes: likes?.length || 0,
          });
        }
      } catch (error: any) {
        // Ignore lock-stealing errors, they're not critical
        if (error?.message?.includes('Lock') || error?.message?.includes('token')) {
          console.warn('Auth lock recovered automatically');
          return;
        }
        console.error('Error loading profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();

    // Cleanup
    return () => {
      authInProgressRef.current = false;
    };
  }, [router]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null;

    try {
      const filename = `${user.id}-${Date.now()}`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(filename, avatarFile);

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filename);

      return publicUrl;
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error('Failed to upload avatar');
      return null;
    }
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    if (!formData.fullName.trim()) {
      toast.error('Full name is required');
      return;
    }

    if (!formData.username.trim()) {
      toast.error('Username is required');
      return;
    }

    setIsSaving(true);

    try {
      let avatarUrl = profile.avatar_url;

      if (avatarFile) {
        const newUrl = await uploadAvatar();
        if (newUrl) {
          avatarUrl = newUrl;
        } else {
          setIsSaving(false);
          return;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          username: formData.username,
          bio: formData.bio || null,
          description: formData.description || null,
          website: formData.website || null,
          avatar_url: avatarUrl,
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              full_name: formData.fullName,
              username: formData.username,
              bio: formData.bio,
              description: formData.description,
              website: formData.website,
              avatar_url: avatarUrl,
            }
          : null
      );
      setAvatarFile(null);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
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
        <p className="text-[#8892A4]">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <h1 className="text-4xl font-playfair font-bold text-[#EAEAEA] mb-2">
          Edit Profile
        </h1>
        <p className="text-[#8892A4] mb-12">
          Manage your profile information and public presence
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
          <div className="card p-6 text-center">
            <p className="text-[#8892A4] text-sm mb-2">Published Blogs</p>
            <p className="text-3xl font-bold text-[#EAEAEA]">
              {stats.totalBlogs}
            </p>
          </div>
          <div className="card p-6 text-center">
            <p className="text-[#8892A4] text-sm mb-2">Total Likes</p>
            <p className="text-3xl font-bold text-[#E94560]">
              ❤️ {stats.totalLikes}
            </p>
          </div>
          <div className="card p-6 text-center">
            <p className="text-[#8892A4] text-sm mb-2">Member Since</p>
            <p className="text-sm font-medium text-[#EAEAEA]">
              {new Date(profile.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="card p-8 space-y-6">
          {/* Avatar Upload */}
          <div>
            <label className="block text-sm font-medium text-[#EAEAEA] mb-4">
              Profile Photo
            </label>
            <div className="flex items-start gap-6">
              {avatarPreview ? (
                <div className="relative group">
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="w-24 h-24 rounded-full object-cover border border-[#2A2A4A]"
                  />
                  <button
                    onClick={() => {
                      setAvatarFile(null);
                      setAvatarPreview('');
                    }}
                    className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium transition-opacity"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-[#1A1A2E] border border-[#2A2A4A] flex items-center justify-center text-[#8892A4]">
                  No photo
                </div>
              )}

              <label className="flex-1">
                <div className="border-2 border-dashed border-[#2A2A4A] rounded-lg p-4 text-center cursor-pointer hover:border-[#E94560] transition-colors">
                  <Upload className="mx-auto mb-2 text-[#8892A4]" size={24} />
                  <p className="text-sm text-[#EAEAEA]">Click to upload</p>
                  <p className="text-xs text-[#8892A4]">PNG, JPG up to 5MB</p>
                </div>
                <input
                  type="file"
                  onChange={handleAvatarChange}
                  accept="image/*"
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              className="w-full px-4 py-2 bg-[#1A1A2E] text-[#EAEAEA] border border-[#2A2A4A] rounded focus:border-[#E94560] focus:ring-2 focus:ring-[#E94560]/20 transition-all"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="w-full px-4 py-2 bg-[#1A1A2E] text-[#EAEAEA] border border-[#2A2A4A] rounded focus:border-[#E94560] focus:ring-2 focus:ring-[#E94560]/20 transition-all"
            />
          </div>

          {/* Email (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
              Email
            </label>
            <input
              type="email"
              value={profile.email || ''}
              disabled
              className="w-full px-4 py-2 bg-[#0F0F0F] text-[#8892A4] border border-[#2A2A4A] rounded cursor-not-allowed"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
              Bio (Short)
            </label>
            <input
              type="text"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              placeholder="Writer, creator, coffee enthusiast..."
              maxLength={150}
              className="w-full px-4 py-2 bg-[#1A1A2E] text-[#EAEAEA] border border-[#2A2A4A] rounded focus:border-[#E94560] focus:ring-2 focus:ring-[#E94560]/20 transition-all"
            />
            <p className="text-xs text-[#8892A4] mt-1">
              {formData.bio.length}/150 characters
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
              Description (Full)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Tell us more about yourself and your writing..."
              rows={5}
              className="w-full px-4 py-2 bg-[#1A1A2E] text-[#EAEAEA] border border-[#2A2A4A] rounded focus:border-[#E94560] focus:ring-2 focus:ring-[#E94560]/20 transition-all resize-none"
            />
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
              Website
            </label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleInputChange}
              placeholder="https://yourwebsite.com"
              className="w-full px-4 py-2 bg-[#1A1A2E] text-[#EAEAEA] border border-[#2A2A4A] rounded focus:border-[#E94560] focus:ring-2 focus:ring-[#E94560]/20 transition-all"
            />
          </div>

          {/* Save Button */}
          <div className="pt-6 border-t border-[#2A2A4A]">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full px-6 py-3 bg-[#E94560] text-[#EAEAEA] rounded font-medium hover:bg-[#FF6B6B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Profile'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
