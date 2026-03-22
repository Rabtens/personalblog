'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, User, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';

const signupSchema = z
  .object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and dashes'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      // Validate form
      const validatedData = signupSchema.parse(formData);

      // Check if username is unique
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', validatedData.username)
        .single();

      if (existingUser) {
        setErrors({ username: 'Username already taken' });
        return;
      }

      // Sign up user
      const { data: authData, error: authError } =
        await supabase.auth.signUp({
          email: validatedData.email,
          password: validatedData.password,
          options: {
            data: {
              full_name: validatedData.fullName,
              username: validatedData.username,
            },
          },
        });

      if (authError) {
        toast.error(authError.message);
        return;
      }

      if (!authData.user) {
        toast.error('Failed to create account');
        return;
      }

      // Profile is auto-created by database trigger
      // Wait briefly for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 500));

      toast.success(
        'Account created! Check your email to confirm your account.'
      );
      setTimeout(() => {
        router.push('/auth/signin');
      }, 1500);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      } else {
        toast.error('An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-playfair font-bold text-[#EAEAEA] mb-2">
            Join Blog_lhabsa
          </h1>
          <p className="text-[#8892A4]">
            Create an account and start sharing your stories
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
              Full Name
            </label>
            <div className="relative">
              <User
                size={18}
                className="absolute left-3 top-3 text-[#8892A4]"
              />
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full pl-10 pr-4 py-2 bg-[#1A1A2E] text-[#EAEAEA] border border-[#2A2A4A] rounded focus:border-[#E94560] focus:ring-2 focus:ring-[#E94560]/20 transition-all"
              />
            </div>
            {errors.fullName && (
              <p className="text-[#FF6B6B] text-xs mt-1">{errors.fullName}</p>
            )}
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
              Username
            </label>
            <div className="relative">
              <User
                size={18}
                className="absolute left-3 top-3 text-[#8892A4]"
              />
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="john_doe"
                className="w-full pl-10 pr-4 py-2 bg-[#1A1A2E] text-[#EAEAEA] border border-[#2A2A4A] rounded focus:border-[#E94560] focus:ring-2 focus:ring-[#E94560]/20 transition-all"
              />
            </div>
            {errors.username && (
              <p className="text-[#FF6B6B] text-xs mt-1">{errors.username}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
              Email
            </label>
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3 top-3 text-[#8892A4]"
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                className="w-full pl-10 pr-4 py-2 bg-[#1A1A2E] text-[#EAEAEA] border border-[#2A2A4A] rounded focus:border-[#E94560] focus:ring-2 focus:ring-[#E94560]/20 transition-all"
              />
            </div>
            {errors.email && (
              <p className="text-[#FF6B6B] text-xs mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
              Password
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-3 text-[#8892A4]"
              />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2 bg-[#1A1A2E] text-[#EAEAEA] border border-[#2A2A4A] rounded focus:border-[#E94560] focus:ring-2 focus:ring-[#E94560]/20 transition-all"
              />
            </div>
            {errors.password && (
              <p className="text-[#FF6B6B] text-xs mt-1">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-3 text-[#8892A4]"
              />
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2 bg-[#1A1A2E] text-[#EAEAEA] border border-[#2A2A4A] rounded focus:border-[#E94560] focus:ring-2 focus:ring-[#E94560]/20 transition-all"
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-[#FF6B6B] text-xs mt-1">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-[#E94560] text-[#EAEAEA] rounded font-medium hover:bg-[#FF6B6B] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Sign In Link */}
        <p className="text-center text-[#8892A4] mt-6">
          Already have an account?{' '}
          <Link
            href="/auth/signin"
            className="text-[#E94560] hover:text-[#FF6B6B] transition-colors font-medium"
          >
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
