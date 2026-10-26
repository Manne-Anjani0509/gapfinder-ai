'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  FileText,
  Network,
  FileCheck,
  BarChart2,
  Calendar,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/materials', label: 'Materials', icon: FileText },
    { href: '/topics', label: 'Topic Map', icon: Network },
    { href: '/quiz', label: 'Quiz', icon: FileCheck },
    { href: '/gap-report', label: 'Gap Report', icon: BarChart2 },
    { href: '/revision-plan', label: 'Revision Plan', icon: Calendar },
    { href: '/tutor', label: 'Ask AI', icon: Sparkles },
    { href: '/progress', label: 'Progress', icon: TrendingUp },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Floating Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-[250px] flex-col bg-white rounded-r-3xl lg:rounded-3xl shadow-[0_10px_35px_rgba(110,130,160,0.08)] border border-slate-100 p-5 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 my-0 lg:my-3 lg:ml-3 shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Logo Header */}
        <div className="flex items-center justify-between pb-6 pt-1 px-2">
          <Link href="/" className="flex items-center gap-3 group" onClick={onClose}>
            {/* Custom SVG Logo matching screenshot (4 circular petal nodes) */}
            <div className="w-8 h-8 relative flex items-center justify-center shrink-0">
              <svg viewBox="0 0 36 36" fill="none" className="w-8 h-8">
                <circle cx="12" cy="12" r="7" fill="#6366F1" fillOpacity="0.9" />
                <circle cx="24" cy="12" r="7" fill="#818CF8" fillOpacity="0.8" />
                <circle cx="12" cy="24" r="7" fill="#4F46E5" />
                <circle cx="24" cy="24" r="7" fill="#A5B4FC" fillOpacity="0.85" />
              </svg>
            </div>
            <div className="flex items-center">
              <span className="font-extrabold text-lg text-[#1E293B] tracking-tight">
                GapFinder
              </span>
              <span className="font-bold text-lg text-[#4F46E5] ml-1.5">
                AI
              </span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md lg:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items List */}
        <nav className="flex-1 space-y-1.5 py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#EEF2FF] text-[#4F46E5] font-semibold shadow-xs'
                    : 'text-[#64748B] hover:text-[#1E293B] hover:bg-slate-50'
                }`}
              >
                <Icon
                  className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                    isActive ? 'text-[#4F46E5]' : 'text-[#64748B]'
                  }`}
                  strokeWidth={isActive ? 2.3 : 1.9}
                />
                <span className="tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Card: Mountain illustration and inspirational quote */}
        <div className="mt-auto pt-3">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#F1F5F9] to-[#E2E8F0]/70 p-4 border border-slate-100/80">
            {/* Soft Pastel Mountain Silhouette */}
            <div className="h-16 w-full relative mb-1">
              <svg
                viewBox="0 0 200 80"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full object-cover"
                preserveAspectRatio="none"
              >
                {/* Sun glow */}
                <circle cx="150" cy="25" r="14" fill="#FDE68A" fillOpacity="0.6" />
                {/* Back mountain */}
                <path
                  d="M10 80L80 30L150 80Z"
                  fill="#C7D2FE"
                  fillOpacity="0.5"
                />
                {/* Mid mountain */}
                <path
                  d="M60 80L130 20L195 80Z"
                  fill="#A5B4FC"
                  fillOpacity="0.6"
                />
                {/* Foreground mountain */}
                <path
                  d="M-10 80L45 40L110 80Z"
                  fill="#818CF8"
                  fillOpacity="0.4"
                />
                <path
                  d="M90 80L155 35L210 80Z"
                  fill="#6366F1"
                  fillOpacity="0.3"
                />
              </svg>
            </div>
            <p className="text-[12px] font-medium text-[#475569] leading-snug">
              Smaller gaps<br />brighter tomorrows.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
