'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useApp } from '@/context/AppContext';

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auth pages that don't need shell layout
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password';

  useEffect(() => {
    if (isLoading) return;

    // If unauthenticated user tries to access protected dashboard routes, redirect to /login
    if (!user && !isAuthPage) {
      router.replace('/login');
    } else if (user && isAuthPage) {
      // If authenticated user visits login or signup, redirect to dashboard
      router.replace('/');
    }
  }, [isLoading, isAuthPage, user, router]);

  // Auth pages render standalone immediately
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Loading indicator on initial session check for protected dashboard routes
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 relative flex items-center justify-center mb-3">
          <svg viewBox="0 0 36 36" fill="none" className="w-10 h-10 animate-pulse">
            <circle cx="12" cy="12" r="7" fill="#6366F1" fillOpacity="0.9" />
            <circle cx="24" cy="12" r="7" fill="#818CF8" fillOpacity="0.8" />
            <circle cx="12" cy="24" r="7" fill="#4F46E5" />
            <circle cx="24" cy="24" r="7" fill="#A5B4FC" fillOpacity="0.85" />
          </svg>
        </div>
        <p className="text-xs font-semibold text-slate-500 tracking-tight">
          Loading GapFinder AI...
        </p>
      </div>
    );
  }

  // Prevent flash of protected dashboard if unauthenticated
  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F0F4F8] font-sans text-[#1E293B]">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-y-auto">
        <Header onOpenSidebar={() => setSidebarOpen(true)} />

        <main className="flex-1 px-3 sm:px-5 lg:px-6 pb-8 max-w-[1500px] w-full mx-auto space-y-5">
          {children}
        </main>
      </div>
    </div>
  );
}
