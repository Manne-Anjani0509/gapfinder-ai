'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  Mail,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      if (!supabase || !isSupabaseConfigured()) {
        setErrorMsg('Supabase authentication is not configured in this environment.');
        setIsLoading(false);
        return;
      }

      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });

      if (error) {
        setErrorMsg(error.message || 'Failed to send recovery email. Please check the address and try again.');
        setIsLoading(false);
        return;
      }

      setSuccessMsg(
        `We have sent a password recovery link to ${cleanEmail}. Please check your inbox (and spam folder) to set a new password.`
      );
    } catch (err: any) {
      console.error('Password reset error:', err);
      setErrorMsg(err.message || 'Failed to send recovery email. Please try again.');
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

          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#4F46E5] flex items-center justify-center mx-auto mb-3 shadow-xs">
            <KeyRound className="w-6 h-6 stroke-[2.2]" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Reset your password
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
            Enter your registered email address and we&apos;ll send you a secure link to reset your password.
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

          {!successMsg ? (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
                >
                  Registered Email Address
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#4F46E5] hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-bold shadow-md shadow-indigo-100 hover:shadow-lg hover:shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Recovery Link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Recovery Link</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center pt-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-2xl bg-[#4F46E5] hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          )}

          {/* Return to Sign In */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#4F46E5] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
