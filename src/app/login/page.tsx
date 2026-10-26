'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, setUser, continueAsDemoGuest } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const DEMO_EMAIL = 'demo@gapfinder.ai';
  const DEMO_PASSWORD = 'GapFinder@123';

  // If user is already authenticated, redirect straight to dashboard
  React.useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);

    try {
      if (!supabase || !isSupabaseConfigured()) {
        setErrorMsg('Supabase authentication is not configured in this environment. You can use "Continue as Demo Guest" below.');
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        if (
          error.message.toLowerCase().includes('invalid login credentials') ||
          error.message.toLowerCase().includes('invalid credentials')
        ) {
          setErrorMsg('Invalid email or password. Please verify your credentials or sign up for a new account.');
        } else if (
          error.message.toLowerCase().includes('email not confirmed') ||
          error.message.toLowerCase().includes('unconfirmed')
        ) {
          setErrorMsg('Your email address has not been confirmed. Please check your inbox for the confirmation link.');
        } else {
          setErrorMsg(error.message || 'Login failed. Please verify your credentials.');
        }
        setIsLoading(false);
        return;
      }

      if (data?.user) {
        let fullName = data.user.user_metadata?.full_name || data.user.user_metadata?.name;

        if (!fullName) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', data.user.id)
              .maybeSingle();

            if (profile?.full_name) {
              fullName = profile.full_name;
            }
          } catch {
            // ignore profile fetch error
          }
        }

        if (!fullName) {
          fullName = cleanEmail.split('@')[0];
        }

        const student = {
          id: data.user.id,
          email: data.user.email || cleanEmail,
          fullName,
        };

        setUser(student);

        if (data.session?.access_token && typeof document !== 'undefined') {
          document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=604800; SameSite=Lax`;
        }

        setSuccessMsg('Authentication successful! Redirecting to your dashboard...');
        router.replace('/');
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            if (window.location.pathname === '/login') {
              window.location.href = '/';
            }
          }, 400);
        }
        return;
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg(err.message || 'An unexpected error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoGuest = () => {
    setErrorMsg(null);
    setIsGuestLoading(true);
    continueAsDemoGuest();
    setSuccessMsg('Signed in as Demo Guest! Redirecting to your dashboard...');
    router.replace('/');
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        if (window.location.pathname === '/login') {
          window.location.href = '/';
        }
      }, 300);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-center items-center px-4 py-8 sm:px-6 lg:px-8 font-sans selection:bg-indigo-100 selection:text-indigo-900 relative overflow-hidden">
      {/* Background ambient lighting accents */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-100/40 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-[440px] z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 group mb-4">
            <div className="w-10 h-10 relative flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
              <svg viewBox="0 0 36 36" fill="none" className="w-10 h-10">
                <circle cx="12" cy="12" r="7" fill="#6366F1" fillOpacity="0.9" />
                <circle cx="24" cy="12" r="7" fill="#818CF8" fillOpacity="0.8" />
                <circle cx="12" cy="24" r="7" fill="#4F46E5" />
                <circle cx="24" cy="24" r="7" fill="#A5B4FC" fillOpacity="0.85" />
              </svg>
            </div>
            <div className="flex items-center">
              <span className="font-extrabold text-2xl text-slate-900 tracking-tight">
                GapFinder
              </span>
              <span className="font-bold text-2xl text-[#4F46E5] ml-1">
                AI
              </span>
            </div>
          </Link>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Sign in to your account
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
            Diagnose syllabus knowledge gaps directly from your course materials.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-7 sm:p-9 border border-slate-100 shadow-[0_10px_40px_-10px_rgba(79,70,229,0.07),0_0_0_1px_rgba(226,232,240,0.8)]">
          {/* Alerts */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200/80 text-xs text-rose-800 flex items-start gap-3 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="font-medium leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-xs text-emerald-800 flex items-start gap-3 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="font-medium leading-relaxed">{successMsg}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
              >
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full pl-10 pr-4 py-3 text-xs bg-slate-50/70 hover:bg-slate-50 focus:bg-white rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all text-slate-900 placeholder:text-slate-400 font-medium"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-[#4F46E5] hover:text-indigo-700 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-11 py-3 text-xs bg-slate-50/70 hover:bg-slate-50 focus:bg-white rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all text-slate-900 placeholder:text-slate-400 font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 focus:outline-none p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#4F46E5] hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-bold shadow-md shadow-indigo-100 hover:shadow-lg hover:shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider font-semibold">
              <span className="bg-white px-3 text-slate-400">or explore</span>
            </div>
          </div>

          {/* Demo Guest Option */}
          <button
            id="demo-guest-btn"
            type="button"
            onClick={handleDemoGuest}
            disabled={isLoading || isGuestLoading}
            className="w-full py-2.5 px-4 rounded-2xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-200 text-xs font-semibold text-slate-700 hover:text-[#4F46E5] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isGuestLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4F46E5]" />
                <span>Redirecting to Dashboard...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-[#4F46E5]" />
                <span>Continue as Demo Guest (Anjani)</span>
              </>
            )}
          </button>

          {/* Create Account Link */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 font-medium">
              Don&apos;t have an account yet?{' '}
              <Link
                href="/signup"
                className="font-bold text-[#4F46E5] hover:text-indigo-700 transition-colors"
              >
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
