'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { setUser } = useApp();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim();

    // Validation
    if (!cleanName) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);

    try {
      if (!supabase || !isSupabaseConfigured()) {
        setErrorMsg('Supabase authentication is not configured in this environment. Please configure your Supabase variables.');
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
          },
        },
      });

      if (error) {
        if (
          error.message.toLowerCase().includes('already registered') ||
          error.message.toLowerCase().includes('user already exists')
        ) {
          setErrorMsg('An account with this email address already exists. Please sign in instead.');
        } else if (error.message.toLowerCase().includes('password')) {
          setErrorMsg(error.message);
        } else {
          setErrorMsg(error.message || 'Failed to create account. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      if (data?.user) {
        // Save user's full name in their Supabase profile table
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: cleanEmail,
            full_name: cleanName,
          });
        } catch (profileErr) {
          console.warn('Profile sync notice:', profileErr);
        }

        // Check if email confirmation is required
        if (!data.session) {
          setSuccessMsg(
            `Account created! A confirmation link has been sent to ${cleanEmail}. Please check your email inbox to activate your account, then sign in.`
          );
          setIsLoading(false);
          return;
        }

        const student = {
          id: data.user.id,
          email: data.user.email || cleanEmail,
          fullName: cleanName,
        };
        setUser(student);

        if (data.session.access_token && typeof document !== 'undefined') {
          document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=604800; SameSite=Lax`;
        }

        setSuccessMsg('Account created successfully! Preparing your dashboard...');
        setTimeout(() => {
          router.push('/');
        }, 600);
        return;
      }
    } catch (err: any) {
      console.error('Sign up error:', err);
      setErrorMsg(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
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
            Create your account
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
            Join GapFinder AI to diagnose and close your syllabus knowledge gaps.
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

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Full Name */}
            <div>
              <label
                htmlFor="fullName"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
              >
                Full Name
              </label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Anjani Sharma"
                  className="w-full pl-10 pr-4 py-3 text-xs bg-slate-50/70 hover:bg-slate-50 focus:bg-white rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all text-slate-900 placeholder:text-slate-400 font-medium"
                  required
                />
              </div>
            </div>

            {/* Email Address */}
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

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
              >
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
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

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
              >
                Confirm Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full pl-10 pr-11 py-3 text-xs bg-slate-50/70 hover:bg-slate-50 focus:bg-white rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all text-slate-900 placeholder:text-slate-400 font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 focus:outline-none p-1"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
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
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 font-medium">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-bold text-[#4F46E5] hover:text-indigo-700 transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
