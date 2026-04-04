'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Menu,
  X,
  LogOut,
  Settings,
  BookOpen,
  User,
  PenTool,
} from 'lucide-react';

interface User {
  id: string;
  email: string;
}

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const authCheckRef = useRef(false);
  const authInProgressRef = useRef(false);

  useEffect(() => {
    // Prevent race conditions
    if (authInProgressRef.current || authCheckRef.current) {
      return;
    }

    const getAuth = async () => {
      try {
        authInProgressRef.current = true;

        const {
          data: { session },
        } = await supabase.auth.getSession();

        authInProgressRef.current = false;

        const currentUser = session?.user;
        setUser(currentUser as User | null);
        authCheckRef.current = true;

        if (currentUser) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
          setProfile(data as Profile | null);
        }
      } catch (error: any) {
        // Ignore lock-stealing errors
        if (error?.message?.includes('Lock') || error?.message?.includes('token')) {
          console.warn('Auth lock recovered');
          return;
        }
        console.error('Error fetching auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user;
      setUser(currentUser as User | null);

      if (currentUser) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        setProfile(data as Profile | null);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
      authInProgressRef.current = false;
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setDropdownOpen(false);
    router.push('/');
  };

  if (isLoading) {
    return (
      <nav className="sticky top-0 z-50 bg-[#0F0F0F]/95 backdrop-blur border-b border-[#2A2A4A] px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-lg sm:text-xl md:text-2xl font-playfair font-bold gradient-text">
            📝 Blog_lhabsa
          </div>
        </div>
      </nav>
    );
  }

  return (
    <>
      <nav className="sticky top-0 z-50 bg-[#0F0F0F]/95 backdrop-blur border-b border-[#2A2A4A] px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Logo */}
          <Link
            href="/"
            className="text-lg sm:text-xl md:text-2xl font-playfair font-bold gradient-text hover:opacity-80 transition-opacity"
          >
            📝 Blog_lhabsa
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-6 lg:gap-8 items-center text-sm md:text-base">
            <Link
              href="/"
              className="text-[#EAEAEA] hover:text-[#E94560] transition-colors"
            >
              Home
            </Link>
            <Link
              href="/#featured"
              className="text-[#EAEAEA] hover:text-[#E94560] transition-colors"
            >
              Explore
            </Link>

            {user ? (
              <>
                <Link
                  href="/write"
                  className="flex items-center gap-2 text-[#EAEAEA] hover:text-[#E94560] transition-colors"
                >
                  <PenTool size={18} />
                  Write
                </Link>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.full_name}
                        className="w-9 h-9 rounded-full border border-[#2A2A4A]"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#E94560] flex items-center justify-center text-xs font-bold">
                        {profile?.full_name?.[0] || 'U'}
                      </div>
                    )}
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 card animate-slideUp">
                      <div className="p-4 border-b border-[#2A2A4A]">
                        <p className="font-medium text-[#EAEAEA]">
                          {profile?.full_name}
                        </p>
                        <p className="text-sm text-[#8892A4]">
                          @{profile?.username}
                        </p>
                      </div>
                      <div className="p-2">
                        <Link
                          href="/profile"
                          className="flex items-center gap-3 px-4 py-2 rounded hover:bg-[#242442] transition-colors"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <User size={18} />
                          My Profile
                        </Link>
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-3 px-4 py-2 rounded hover:bg-[#242442] transition-colors"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <BookOpen size={18} />
                          Dashboard
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2 rounded hover:bg-[#242442] text-left text-[#8892A4] hover:text-[#EAEAEA] transition-colors"
                        >
                          <LogOut size={18} />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/auth/signin" className="text-[#EAEAEA] hover:text-[#E94560] transition-colors">
                  Sign In
                </Link>
                <Link href="/auth/signup" className="btn-secondary">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X size={24} className="text-[#E94560]" />
            ) : (
              <Menu size={24} className="text-[#EAEAEA]" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-[#2A2A4A] animate-slideUp">
            <div className="flex flex-col gap-4 pt-4">
              <Link
                href="/"
                className="text-[#EAEAEA] hover:text-[#E94560] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/#featured"
                className="text-[#EAEAEA] hover:text-[#E94560] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Explore
              </Link>

              {user ? (
                <>
                  <Link
                    href="/write"
                    className="flex items-center gap-2 text-[#EAEAEA] hover:text-[#E94560] transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <PenTool size={18} />
                    Write
                  </Link>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 text-[#EAEAEA] hover:text-[#E94560] transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User size={18} />
                    My Profile
                  </Link>
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 text-[#EAEAEA] hover:text-[#E94560] transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <BookOpen size={18} />
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-[#8892A4] hover:text-[#EAEAEA] transition-colors text-left"
                  >
                    <LogOut size={18} />
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    className="text-[#EAEAEA] hover:text-[#E94560] transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="btn-secondary text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Close dropdown when clicking outside */}
      {dropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setDropdownOpen(false)}
        />
      )}
    </>
  );
}
