'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SigninPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrors({
            email: 'Invalid email or password',
          });
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success('Signed in successfully!');
      
      // Wait briefly for session to be established
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      toast.error('An error occurred. Please try again.');
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
            Welcome Back
          </h1>
          <p className="text-[#8892A4]">Sign in to your Blog_lhabsa account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) {
                    setErrors((prev) => ({ ...prev, email: '' }));
                  }
                }}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2 bg-[#1A1A2E] text-[#EAEAEA] border border-[#2A2A4A] rounded focus:border-[#E94560] focus:ring-2 focus:ring-[#E94560]/20 transition-all"
              />
            </div>
            {errors.email && (
              <p className="text-[#FF6B6B] text-xs mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-[#EAEAEA]">
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-[#E94560] hover:text-[#FF6B6B] transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-3 text-[#8892A4]"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) {
                    setErrors((prev) => ({ ...prev, password: '' }));
                  }
                }}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2 bg-[#1A1A2E] text-[#EAEAEA] border border-[#2A2A4A] rounded focus:border-[#E94560] focus:ring-2 focus:ring-[#E94560]/20 transition-all"
              />
            </div>
            {errors.password && (
              <p className="text-[#FF6B6B] text-xs mt-1">{errors.password}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-[#E94560] text-[#EAEAEA] rounded font-medium hover:bg-[#FF6B6B] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-6"
          >
            {isLoading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Sign Up Link */}
        <p className="text-center text-[#8892A4] mt-6">
          Don't have an account?{' '}
          <Link
            href="/auth/signup"
            className="text-[#E94560] hover:text-[#FF6B6B] transition-colors font-medium"
          >
            Sign up here
          </Link>
        </p>
      </div>
    </div>
  );
}
