'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, ChevronDown, Menu, LogOut, User, LogIn, Sparkles, Shield } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';

interface HeaderProps {
  onOpenSidebar: () => void;
}

export function Header({ onOpenSidebar }: HeaderProps) {
  const router = useRouter();
  const { studentName, studentFirstName, studentEmail, user, signOut, isDemoMode, toggleDemoMode } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/tutor?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleSignOut = async () => {
    setProfileDropdownOpen(false);
    await signOut();
    router.push('/login');
  };

  return (
    <header className="flex items-center justify-between gap-4 py-4 px-2 sm:px-4 lg:px-6 relative z-30">
      {/* Mobile Drawer Toggle & Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onOpenSidebar}
          className="p-2.5 text-slate-600 bg-white hover:bg-slate-50 border border-slate-100 rounded-full shadow-xs lg:hidden shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search Pill Input */}
        <form onSubmit={handleSearch} className="relative flex-1">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics, notes, or ask anything..."
              className="w-full pl-11 pr-4 py-2.5 text-[13px] bg-white rounded-full border border-slate-100 shadow-[0_2px_12px_rgba(110,130,160,0.06)] placeholder:text-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            />
          </div>
        </form>
      </div>

      {/* Right Controls: Notification Bell + Student Profile */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Notification Bell with Red Badge */}
        <button
          className="relative w-10 h-10 rounded-full bg-white border border-slate-100 shadow-[0_2px_10px_rgba(110,130,160,0.06)] flex items-center justify-center hover:bg-slate-50 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4 text-slate-600" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        {/* Student Profile Pill & Dropdown */}
        <div ref={dropdownRef} className="relative">
          <div
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-3 pl-1 cursor-pointer select-none py-1 rounded-full hover:bg-slate-100/50 transition-colors"
          >
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-xs shrink-0 bg-indigo-100 flex items-center justify-center relative">
              <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
                <rect width="40" height="40" fill="#E2E8F0" />
                <path d="M6 40C6 31 12 28 20 28C28 28 34 31 34 40Z" fill="#1E293B" />
                <path d="M16 28L20 34L24 28Z" fill="#FFFFFF" />
                <path d="M17 22H23V28H17Z" fill="#F0C3B0" />
                <ellipse cx="20" cy="18" rx="6.5" ry="7.5" fill="#F8D7C9" />
                <circle cx="13.5" cy="18" r="1.5" fill="#F0C3B0" />
                <circle cx="26.5" cy="18" r="1.5" fill="#F0C3B0" />
                <path d="M13 16C13 11 16 10 20 10C24 10 27 11 27 16C27 15 25 12 20 12C15 12 13 15 13 16Z" fill="#18181B" />
                <path d="M13.5 14C13.5 10 16 9 20 9C24 9 26.5 10 26.5 14C25 11 23 10.5 20 10.5C17 10.5 15 11 13.5 14Z" fill="#18181B" />
              </svg>
            </div>

            <div className="hidden sm:flex flex-col text-left">
              <span className="text-[13px] font-bold text-slate-800 leading-tight">
                {studentFirstName}
              </span>
              <span className="text-[11px] font-medium text-slate-400 leading-tight mt-0.5">
                {user ? (user.email.length > 18 ? `${user.email.substring(0, 16)}...` : user.email) : 'Class 12 • JEE'}
              </span>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block -ml-0.5" />
          </div>

          {/* Profile Dropdown Menu */}
          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-100 shadow-[0_10px_35px_rgba(110,130,160,0.15)] py-3 px-3 z-50 text-xs text-slate-700 animate-in fade-in duration-150">
              {/* User Identity info */}
              <div className="pb-3 border-b border-slate-100 px-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-slate-900 text-sm">{studentName}</span>
                  {isDemoMode && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      Demo
                    </span>
                  )}
                  {user && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Live
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 font-mono truncate">{studentEmail}</p>
              </div>

              {/* Menu items */}
              <div className="py-2 space-y-1">
                <button
                  onClick={() => {
                    toggleDemoMode();
                    setProfileDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left hover:bg-slate-50 font-medium transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Mode: {isDemoMode ? 'Demo Dataset' : 'Live Data'}</span>
                  </span>
                  <span className="text-[10px] text-indigo-600 font-bold">Toggle</span>
                </button>
              </div>

              {/* Auth Action */}
              <div className="pt-2 border-t border-slate-100">
                {user ? (
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left text-rose-600 hover:bg-rose-50 font-semibold transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <div className="space-y-1">
                    <Link
                      href="/login"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left text-indigo-600 hover:bg-indigo-50 font-semibold transition-colors"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Log In to Live Account</span>
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left text-slate-600 hover:bg-slate-50 font-medium transition-colors"
                    >
                      <User className="w-4 h-4" />
                      <span>Create New Account</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
