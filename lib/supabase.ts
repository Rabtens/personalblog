import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to get current user
export const getCurrentUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};

// Helper function to get user profile
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

// Helper function to get profile by username
export const getProfileByUsername = async (username: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (error) throw error;
  return data;
};

// Helper function to get blog
export const getBlog = async (blogId: string) => {
  const { data, error } = await supabase
    .from('blogs')
    .select(
      `
      *,
      profiles:user_id(id, username, full_name, avatar_url),
      likes(user_id),
      comments(count)
    `
    )
    .eq('id', blogId)
    .single();

  if (error) throw error;
  return data;
};

// Helper to increment blog view count
export const incrementViewCount = async (blogId: string) => {
  const { data, error } = await supabase.rpc('increment_view_count', {
    blog_id: blogId,
  });

  if (error) {
    // Fallback: manual update
    const { data: blog } = await supabase
      .from('blogs')
      .select('view_count')
      .eq('id', blogId)
      .single();

    if (blog) {
      await supabase
        .from('blogs')
        .update({ view_count: (blog.view_count || 0) + 1 })
        .eq('id', blogId);
    }
  }

  return data;
};

// Type exports
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          email: string | null;
          bio: string | null;
          description: string | null;
          avatar_url: string | null;
          website: string | null;
          created_at: string;
        };
      };
      blogs: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: string;
          cover_image_url: string | null;
          status: 'draft' | 'published';
          view_count: number;
          created_at: string;
          updated_at: string;
        };
      };
      likes: {
        Row: {
          id: string;
          blog_id: string;
          user_id: string;
          created_at: string;
        };
      };
      comments: {
        Row: {
          id: string;
          blog_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
      };
    };
  };
};
